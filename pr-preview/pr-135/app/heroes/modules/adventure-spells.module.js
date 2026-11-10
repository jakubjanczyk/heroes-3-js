import { createEntityBehaviors } from '../../../game/domain/entity-behaviors.js'
import { isTown } from '../../../game/domain/entity-queries.js'
import { resolveMovementRules } from '../../../game/domain/movement/movement-rules.js'
import {
  aimsAtTile,
  canCastOnMap,
  decideDimensionDoor,
  decideTownPortal,
  decideTownPortalTo,
  dimensionDoorTargetAt,
  flightOf,
  viewWorldOf
} from '../../../game/heroes/adventure-spells.js'
import { getTownName } from '../../../game/heroes/entity-behaviors/town.js'
import { spellCost } from '../../../game/heroes/spell-book.js'
import { heroById } from '../../../game/heroes/state/hero-details.js'
import { townIdsOf } from '../../../game/heroes/state/towns.js'
import { visionsOf } from '../../../game/heroes/visions.js'
import { heroMovementPoints, heroOwner, heroTile } from '../../../game/state/queries.js'
import { createHeroRoutes } from '../../../game/systems/hero-routes.js'
import {
  APP_COMMAND_HERO_ADVENTURE_SPELL_CAST_REQUESTED,
  APP_COMMAND_HERO_TELEPORT_REQUESTED,
  APP_COMMAND_MAP_TILE_AIMED,
  APP_FACT_HERO_ADVENTURE_SPELL_CAST,
  APP_FACT_HERO_MOVED,
  APP_FACT_MOVEMENT_POINTS_CHANGED,
  APP_FACT_PREVIEW_CLEARED,
  APP_FACT_TOWN_VISITED,
  APP_FACT_WORLD_READY,
  APP_UI_MAP_AIMING_ENDED,
  APP_UI_MAP_AIMING_STARTED,
  APP_UI_NOTICE_OPENED,
  APP_UI_TOWN_PORTAL_TOWNS_OFFERED,
  APP_UI_VIEW_WORLD_OPENED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

export const registerAdventureSpellsModule = defineModule(
  ({ emit, emitAll, state, config }) => {
    const heroRoutes = createHeroRoutes({
      entityBehaviors: createEntityBehaviors(config?.content?.entityBehaviors),
      movementRules: resolveMovementRules(config?.content?.movementRules),
      getState: state.get
    })
    let definitions = {}
    let townsById = new Map()
    let map = null
    let aim = null

    function townsOf(heroId) {
      return townIdsOf(state.get(), heroOwner(state.get(), heroId))
        .map((townId) => townsById.get(townId))
        .filter(Boolean)
    }

    function teleport(hero, spellId, { destination, movementPoints }) {
      spendCast(hero, spellId, movementPoints)
      emitAll([
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

    function castableSpell(heroId, spellId) {
      const hero = heroById(state.get(), heroId)
      const spell = definitions.spells?.[spellId]
      if (!hero?.spells.includes(spellId) || !canCastOnMap(spell)) {
        return null
      }
      return spellCost(hero, spell) > hero.spellPoints ? null : { hero, spell }
    }

    function spendCast(hero, spellId, movementPoints, effect = {}) {
      const { value, max } = heroMovementPoints(state.get(), hero.id)
      emitAll([
        {
          type: APP_FACT_HERO_ADVENTURE_SPELL_CAST,
          detail: {
            heroId: hero.id,
            spellId,
            cost: spellCost(hero, definitions.spells[spellId]),
            ...effect
          }
        },
        ...(movementPoints > 0
          ? [
              {
                type: APP_FACT_MOVEMENT_POINTS_CHANGED,
                detail: { heroId: hero.id, value: Math.max(0, value - movementPoints), max }
              }
            ]
          : [])
      ])
    }

    function startAiming(heroId, spellId) {
      const { hero, spell } = castableSpell(heroId, spellId) ?? {}
      if (!hero) {
        return
      }
      const { failure } = decideDimensionDoor({ state: state.get(), hero, spell, spellId })
      if (failure) {
        emit(APP_UI_NOTICE_OPENED, { title: null, message: failure })
        return
      }
      aim = { heroId, spellId }
      emit(APP_UI_MAP_AIMING_STARTED, { heroId, spellId })
    }

    function castAt(tile) {
      const { hero, spell } = (aim && castableSpell(aim.heroId, aim.spellId)) ?? {}
      if (!hero) {
        return
      }
      const outcome = dimensionDoorTargetAt({
        state: state.get(),
        hero,
        spell,
        map,
        isTaken: (target) => heroRoutes.occupancy.getAt(target) !== null,
        tile
      })
      if (!outcome) {
        return
      }
      const { spellId } = aim
      aim = null
      emit(APP_UI_MAP_AIMING_ENDED, {})
      spendCast(hero, spellId, outcome.movementPoints)
      if (outcome.failure) {
        emit(APP_UI_NOTICE_OPENED, { title: null, message: outcome.failure })
        return
      }
      emit(APP_COMMAND_HERO_TELEPORT_REQUESTED, { heroId: hero.id, tile: outcome.destination })
    }

    function castLastingSpell(hero, spellId, spell) {
      if (spell.fly) {
        spendCast(hero, spellId, 0, { flight: flightOf(hero, spell) })
        // A route planned on foot is planned again in the air.
        emit(APP_FACT_PREVIEW_CLEARED, { heroId: hero.id })
      } else {
        spendCast(hero, spellId, 0, { visions: visionsOf(hero, spell) })
      }
    }

    function castTownPortal(hero, spellId, spell, townId) {
      const decide = townId ? decideTownPortalTo : decideTownPortal
      const outcome = decide({ state: state.get(), hero, spell, towns: townsOf(hero.id), townId })
      if (outcome.failure) {
        emit(APP_UI_NOTICE_OPENED, { title: null, message: outcome.failure })
      } else if (outcome.choices) {
        emit(APP_UI_TOWN_PORTAL_TOWNS_OFFERED, {
          heroId: hero.id,
          spellId,
          towns: outcome.choices.map(({ id, name }) => ({ id, name }))
        })
      } else if (outcome.destination) {
        teleport(hero, spellId, outcome)
      }
    }

    function cast({ heroId, spellId, townId }) {
      if (aimsAtTile(definitions.spells?.[spellId])) {
        startAiming(heroId, spellId)
        return
      }
      const { hero, spell } = castableSpell(heroId, spellId) ?? {}
      if (!hero) {
        return
      }
      if (spell.fly || spell.visions) {
        castLastingSpell(hero, spellId, spell)
      } else if (spell.viewWorld) {
        spendCast(hero, spellId, 0)
        emit(APP_UI_VIEW_WORLD_OPENED, viewWorldOf(hero, spell))
      } else {
        castTownPortal(hero, spellId, spell, townId)
      }
    }

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            definitions = event.detail.definitions
            map = event.detail.map
            aim = null
            heroRoutes.onWorldReady(event.detail)
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
        },
        {
          type: APP_COMMAND_MAP_TILE_AIMED,
          handler: (event) => castAt(event.detail.tile)
        },
        {
          type: APP_UI_MAP_AIMING_ENDED,
          handler: () => {
            aim = null
          }
        }
      ]
    }
  },
  {
    id: 'adventure-spells',
    phase: 'domain',
    consumes: [
      APP_FACT_WORLD_READY,
      APP_COMMAND_HERO_ADVENTURE_SPELL_CAST_REQUESTED,
      APP_COMMAND_MAP_TILE_AIMED,
      APP_UI_MAP_AIMING_ENDED
    ],
    produces: [
      APP_COMMAND_HERO_TELEPORT_REQUESTED,
      APP_UI_MAP_AIMING_STARTED,
      APP_UI_MAP_AIMING_ENDED,
      APP_FACT_HERO_ADVENTURE_SPELL_CAST,
      APP_FACT_MOVEMENT_POINTS_CHANGED,
      APP_FACT_PREVIEW_CLEARED,
      APP_FACT_HERO_MOVED,
      APP_FACT_TOWN_VISITED,
      APP_UI_NOTICE_OPENED,
      APP_UI_TOWN_PORTAL_TOWNS_OFFERED,
      APP_UI_VIEW_WORLD_OPENED
    ]
  }
)
