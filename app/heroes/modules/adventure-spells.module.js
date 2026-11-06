import { isTown } from '../../../game/domain/entity-queries.js'
import {
  canCastOnMap,
  decideTownPortal,
  decideTownPortalTo
} from '../../../game/heroes/adventure-spells.js'
import { getTownName } from '../../../game/heroes/entity-behaviors/town.js'
import { spellCost } from '../../../game/heroes/spell-book.js'
import { heroById } from '../../../game/heroes/state/hero-details.js'
import { townIdsOf } from '../../../game/heroes/state/towns.js'
import { heroMovementPoints, heroOwner, heroTile } from '../../../game/state/queries.js'
import {
  APP_COMMAND_HERO_ADVENTURE_SPELL_CAST_REQUESTED,
  APP_FACT_HERO_ADVENTURE_SPELL_CAST,
  APP_FACT_HERO_MOVED,
  APP_FACT_MOVEMENT_POINTS_CHANGED,
  APP_FACT_TOWN_VISITED,
  APP_FACT_WORLD_READY,
  APP_UI_NOTICE_OPENED,
  APP_UI_TOWN_PORTAL_TOWNS_OFFERED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

export const registerAdventureSpellsModule = defineModule(
  ({ emit, emitAll, state }) => {
    let definitions = {}
    let townsById = new Map()

    function townsOf(heroId) {
      return townIdsOf(state.get(), heroOwner(state.get(), heroId))
        .map((townId) => townsById.get(townId))
        .filter(Boolean)
    }

    function teleport(hero, spellId, { destination, movementPoints }) {
      const spell = definitions.spells[spellId]
      const { value, max } = heroMovementPoints(state.get(), hero.id)
      emitAll([
        {
          type: APP_FACT_HERO_ADVENTURE_SPELL_CAST,
          detail: { heroId: hero.id, spellId, cost: spellCost(hero, spell) }
        },
        {
          type: APP_FACT_MOVEMENT_POINTS_CHANGED,
          detail: { heroId: hero.id, value: Math.max(0, value - movementPoints), max }
        },
        {
          type: APP_FACT_HERO_MOVED,
          detail: {
            heroId: hero.id,
            from: heroTile(state.get(), hero.id),
            to: destination.tile,
            teleported: true
          }
        },
        {
          type: APP_FACT_TOWN_VISITED,
          detail: {
            heroId: hero.id,
            entityId: destination.id,
            entityType: destination.type,
            tile: destination.tile
          }
        }
      ])
    }

    function cast({ heroId, spellId, townId }) {
      const hero = heroById(state.get(), heroId)
      const spell = definitions.spells?.[spellId]
      if (!hero?.spells.includes(spellId) || !canCastOnMap(spell)) {
        return
      }
      if (spellCost(hero, spell) > hero.spellPoints) {
        return
      }

      const decide = townId ? decideTownPortalTo : decideTownPortal
      const outcome = decide({ state: state.get(), hero, spell, towns: townsOf(heroId), townId })
      if (outcome.failure) {
        emit(APP_UI_NOTICE_OPENED, { title: null, message: outcome.failure })
      } else if (outcome.choices) {
        emit(APP_UI_TOWN_PORTAL_TOWNS_OFFERED, {
          heroId,
          spellId,
          towns: outcome.choices.map(({ id, name }) => ({ id, name }))
        })
      } else if (outcome.destination) {
        teleport(hero, spellId, outcome)
      }
    }

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            definitions = event.detail.definitions
            townsById = new Map(
              event.detail.scenario.entities.filter(isTown).map((town) => [
                town.id,
                {
                  id: town.id,
                  type: town.type,
                  tile: town.tile,
                  name: getTownName({ entity: town, definitions })
                }
              ])
            )
          }
        },
        {
          type: APP_COMMAND_HERO_ADVENTURE_SPELL_CAST_REQUESTED,
          handler: (event) => cast(event.detail)
        }
      ]
    }
  },
  {
    id: 'adventure-spells',
    phase: 'domain',
    consumes: [APP_FACT_WORLD_READY, APP_COMMAND_HERO_ADVENTURE_SPELL_CAST_REQUESTED],
    produces: [
      APP_FACT_HERO_ADVENTURE_SPELL_CAST,
      APP_FACT_MOVEMENT_POINTS_CHANGED,
      APP_FACT_HERO_MOVED,
      APP_FACT_TOWN_VISITED,
      APP_UI_NOTICE_OPENED,
      APP_UI_TOWN_PORTAL_TOWNS_OFFERED
    ]
  }
)
