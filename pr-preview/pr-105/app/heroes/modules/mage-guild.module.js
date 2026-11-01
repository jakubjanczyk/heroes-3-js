import { isTown } from '../../../game/domain/entity-queries.js'
import {
  BUY_SPELL_BOOK_QUESTION,
  highestMageGuildLevel,
  isMageGuild,
  mageGuildLevel,
  rollMageGuildSpells,
  SHORT_OF_CASH_FOR_SPELL_BOOK,
  SPELL_BOOK_COST,
  spellPlacesAt,
  spellsToLearn
} from '../../../game/heroes/mage-guild.js'
import { hasSpellBook } from '../../../game/heroes/spell-book.js'
import { heroById } from '../../../game/heroes/state/hero-details.js'
import { resourcesOf } from '../../../game/heroes/state/kingdoms.js'
import { mageGuildSpellsOf } from '../../../game/heroes/state/mage-guilds.js'
import { builtIn, townOwner } from '../../../game/heroes/state/towns.js'
import { townBuildingsCatalogue } from '../../../game/heroes/town-buildings.js'
import { activePlayer, heroIdAt } from '../../../game/state/queries.js'
import {
  APP_COMMAND_MAGE_GUILD_OPEN_REQUESTED,
  APP_FACT_HERO_HIRED,
  APP_FACT_HERO_SPELL_BOOK_BOUGHT,
  APP_FACT_HERO_SPELLS_LEARNED,
  APP_FACT_MAGE_GUILD_SPELLS_ROLLED,
  APP_FACT_RESOURCES_SPENT,
  APP_FACT_TOWN_BUILDING_BUILT,
  APP_FACT_TOWN_LEFT,
  APP_FACT_TOWN_VISITED,
  APP_FACT_WORLD_READY,
  APP_UI_INTERACTION_MODAL_CONFIRMED,
  APP_UI_MAGE_GUILD_UPDATED,
  APP_UI_NOTICE_OPENED,
  APP_UI_RESTORE_COMPLETED,
  APP_UI_RESTORE_STARTED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'
import { SPELL_BOOK_PICTURE } from '../presentation/artifacts.js'

const SPELL_BOOK_SUBJECT = 'mageGuild.spellBook'

// A town's Mage Guild: each built level's spells, drawn the first time they are needed, and taught
// to the hero in the town. A hero there without a spell book is offered one on opening the guild.
export const registerMageGuildModule = defineModule(
  ({ emit, emitAll, config, state }) => {
    const random = typeof config?.random === 'function' ? config.random : Math.random
    let definitions = {}
    let townsById = new Map()
    let openTownId = null
    // Facts replayed on load already include the spells learned then.
    let isRestoring = false

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

    function hasGuild(townId) {
      return townsById.has(townId) && guildOf(townId).builtLevel > 0
    }

    function rollAndTeach(townId, heroId) {
      const rolls = rollMissingLevels(townId)
      if (rolls.length > 0) {
        emitAll(rolls)
      }
      const hero = heroId && heroById(state.get(), heroId)
      const spells = spellsToLearn({
        rolled: mageGuildSpellsOf(state.get(), townId),
        builtLevel: guildOf(townId).builtLevel,
        hero
      })
      if (spells.length > 0) {
        emit(APP_FACT_HERO_SPELLS_LEARNED, { heroId, spells })
      }
    }

    function teachHeroIn(townId, heroId) {
      if (!isRestoring && hasGuild(townId)) {
        rollAndTeach(townId, heroId)
      }
    }

    function heroInTown(townId) {
      return heroIdAt(state.get(), townsById.get(townId).tile)
    }

    function open(townId) {
      openTownId = townId
      rollAndTeach(townId, null)
      show()
    }

    function goldOf(townId) {
      return resourcesOf(state.get(), townOwner(state.get(), townId))?.GOLD_PILE ?? 0
    }

    function offerSpellBook(townId, heroId) {
      if (goldOf(townId) < SPELL_BOOK_COST.GOLD_PILE) {
        open(townId)
        emit(APP_UI_NOTICE_OPENED, { title: null, message: SHORT_OF_CASH_FOR_SPELL_BOOK })
        return
      }
      emit(APP_UI_NOTICE_OPENED, {
        title: null,
        message: BUY_SPELL_BOOK_QUESTION,
        rewards: [{ label: 'Spell Book', caption: ['Spell Book'], picture: SPELL_BOOK_PICTURE }],
        isQuestion: true,
        subject: { kind: SPELL_BOOK_SUBJECT, townId, heroId }
      })
    }

    function requestOpen(townId) {
      if (!hasGuild(townId)) {
        return
      }
      const heroId = heroInTown(townId)
      const isPlayersTurn = townOwner(state.get(), townId) === activePlayer(state.get())
      if (heroId && isPlayersTurn && !hasSpellBook(heroById(state.get(), heroId))) {
        offerSpellBook(townId, heroId)
        return
      }
      open(townId)
    }

    function buySpellBook(townId, heroId) {
      if (goldOf(townId) < SPELL_BOOK_COST.GOLD_PILE || heroInTown(townId) !== heroId) {
        return
      }
      emitAll([
        {
          type: APP_FACT_RESOURCES_SPENT,
          detail: {
            player: townOwner(state.get(), townId),
            resources: { ...SPELL_BOOK_COST },
            reason: 'mageGuild.spellBook',
            entityId: townId
          }
        },
        { type: APP_FACT_HERO_SPELL_BOOK_BOUGHT, detail: { heroId, entityId: townId } }
      ])
      rollAndTeach(townId, heroId)
    }

    function answerSpellBookOffer({ choice, subject }) {
      if (choice === 'yes') {
        buySpellBook(subject.townId, subject.heroId)
      }
      open(subject.townId)
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
          handler: (event) => requestOpen(event.detail.entityId)
        },
        {
          type: APP_UI_INTERACTION_MODAL_CONFIRMED,
          handler: ({ detail }) => {
            if (detail.subject?.kind === SPELL_BOOK_SUBJECT) {
              answerSpellBookOffer(detail)
            }
          }
        },
        {
          type: APP_FACT_TOWN_VISITED,
          handler: ({ detail }) => teachHeroIn(detail.entityId, detail.heroId)
        },
        {
          type: APP_FACT_HERO_HIRED,
          handler: ({ detail }) => teachHeroIn(detail.entityId, detail.heroId)
        },
        {
          type: APP_FACT_TOWN_BUILDING_BUILT,
          handler: ({ detail }) => {
            if (isMageGuild(detail.buildingId)) {
              teachHeroIn(detail.entityId, heroInTown(detail.entityId))
            }
          }
        },
        { type: APP_UI_RESTORE_STARTED, handler: () => (isRestoring = true) },
        { type: APP_UI_RESTORE_COMPLETED, handler: () => (isRestoring = false) },
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
    consumes: [
      APP_FACT_WORLD_READY,
      APP_COMMAND_MAGE_GUILD_OPEN_REQUESTED,
      APP_UI_INTERACTION_MODAL_CONFIRMED,
      APP_FACT_TOWN_VISITED,
      APP_FACT_HERO_HIRED,
      APP_FACT_TOWN_BUILDING_BUILT,
      APP_UI_RESTORE_STARTED,
      APP_UI_RESTORE_COMPLETED,
      APP_FACT_TOWN_LEFT
    ],
    produces: [
      APP_FACT_MAGE_GUILD_SPELLS_ROLLED,
      APP_FACT_RESOURCES_SPENT,
      APP_FACT_HERO_SPELL_BOOK_BOUGHT,
      APP_FACT_HERO_SPELLS_LEARNED,
      APP_UI_MAGE_GUILD_UPDATED,
      APP_UI_NOTICE_OPENED
    ]
  }
)
