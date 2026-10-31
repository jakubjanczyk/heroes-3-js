import { isTown } from '../../../game/domain/entity-queries.js'
import {
  highestMageGuildLevel,
  mageGuildLevel,
  rollMageGuildSpells,
  spellPlacesAt
} from '../../../game/heroes/mage-guild.js'
import { mageGuildSpellsOf } from '../../../game/heroes/state/mage-guilds.js'
import { builtIn } from '../../../game/heroes/state/towns.js'
import { townBuildingsCatalogue } from '../../../game/heroes/town-buildings.js'
import {
  APP_COMMAND_MAGE_GUILD_OPEN_REQUESTED,
  APP_FACT_MAGE_GUILD_SPELLS_ROLLED,
  APP_FACT_TOWN_LEFT,
  APP_FACT_WORLD_READY,
  APP_UI_MAGE_GUILD_UPDATED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

// A town's Mage Guild: each built level's spells, drawn the first time the guild is opened.
export const registerMageGuildModule = defineModule(
  ({ emit, emitAll, config, state }) => {
    const random = typeof config?.random === 'function' ? config.random : Math.random
    let definitions = {}
    let townsById = new Map()
    let openTownId = null

    function guildOf(townId) {
      const town = townsById.get(townId)
      const { hall } = townBuildingsCatalogue(definitions, town.type)
      return {
        type: town.type,
        builtLevel: mageGuildLevel(builtIn(state.get(), townId)),
        highestLevel: highestMageGuildLevel(hall)
      }
    }

    function describeSpell(spellId) {
      const spell = definitions.spells?.[spellId] ?? {}
      return {
        spellId,
        name: spell.name ?? spellId,
        description: spell.descriptions?.[0]?.text ?? ''
      }
    }

    function show() {
      const { builtLevel, highestLevel } = guildOf(openTownId)
      const rolled = mageGuildSpellsOf(state.get(), openTownId)
      const levels = Array.from({ length: highestLevel }, (_, index) => {
        const level = index + 1
        const isBuilt = level <= builtLevel
        return {
          level,
          spells: isBuilt ? (rolled[level] ?? []).map(describeSpell) : [],
          closedScrolls: isBuilt ? 0 : spellPlacesAt(level)
        }
      })
      emit(APP_UI_MAGE_GUILD_UPDATED, { entityId: openTownId, levels })
    }

    function rollMissingLevels(townId) {
      const { type, builtLevel } = guildOf(townId)
      const rolled = mageGuildSpellsOf(state.get(), townId)
      return Array.from({ length: builtLevel }, (_, index) => index + 1)
        .filter((level) => !rolled[level])
        .map((level) => ({
          type: APP_FACT_MAGE_GUILD_SPELLS_ROLLED,
          detail: {
            entityId: townId,
            level,
            spells: rollMageGuildSpells({
              spells: definitions.spells,
              townType: type,
              level,
              random
            })
          }
        }))
    }

    function open(townId) {
      if (!townsById.has(townId) || guildOf(townId).builtLevel === 0) {
        return
      }

      openTownId = townId
      const rolls = rollMissingLevels(townId)
      if (rolls.length > 0) {
        emitAll(rolls)
      }
      show()
    }

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            definitions = event.detail.definitions ?? {}
            townsById = new Map(
              event.detail.scenario.entities.filter(isTown).map((town) => [town.id, town])
            )
            openTownId = null
          }
        },
        {
          type: APP_COMMAND_MAGE_GUILD_OPEN_REQUESTED,
          handler: (event) => open(event.detail.entityId)
        },
        {
          type: APP_FACT_TOWN_LEFT,
          handler: () => {
            openTownId = null
          }
        }
      ]
    }
  },
  {
    id: 'mage-guild',
    phase: 'domain',
    consumes: [APP_FACT_WORLD_READY, APP_COMMAND_MAGE_GUILD_OPEN_REQUESTED, APP_FACT_TOWN_LEFT],
    produces: [APP_FACT_MAGE_GUILD_SPELLS_ROLLED, APP_UI_MAGE_GUILD_UPDATED]
  }
)
