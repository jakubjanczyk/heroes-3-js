import { isHero, isTown } from '../../../game/domain/entity-queries.js'
import { getHeroArmy } from '../../../game/heroes/hero-army.js'
import { getHeroLuck, getHeroMorale } from '../../../game/heroes/morale-and-luck.js'
import { getHeroPrimarySkills } from '../../../game/heroes/primary-skills.js'
import { startingSecondarySkills } from '../../../game/heroes/secondary-skills.js'
import { maxSpellPoints } from '../../../game/heroes/spell-points.js'
import { heroById } from '../../../game/heroes/state/hero-details.js'
import { resourcesOf } from '../../../game/heroes/state/kingdoms.js'
import { tavernOf } from '../../../game/heroes/state/tavern.js'
import { builtIn, townOwner } from '../../../game/heroes/state/towns.js'
import {
  canHire,
  describeHeroForHire,
  HEROES_FOR_HIRE,
  heroPool,
  rollHeroesForHire,
  rollRumour,
  rumourText
} from '../../../game/heroes/tavern.js'
import { activePlayer, heroIdAt, heroIdsOf } from '../../../game/state/queries.js'
import {
  APP_COMMAND_TAVERN_HIRE_REQUESTED,
  APP_COMMAND_TAVERN_OPEN_REQUESTED,
  APP_FACT_HERO_HIRED,
  APP_FACT_HERO_SELECTED,
  APP_FACT_RESOURCES_SPENT,
  APP_FACT_TAVERN_HEROES_OFFERED,
  APP_FACT_TOWN_LEFT,
  APP_FACT_WORLD_READY,
  APP_UI_TAVERN_UPDATED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

const HIRED_HERO_ID_PREFIX = 'hired-hero-'

// The tavern of a player's town: the two heroes their taverns offer this week, rolled the first
// time one opens, and hiring one of them.
export const registerTavernModule = defineModule(
  ({ emit, emitAll, config, state }) => {
    const random = typeof config?.random === 'function' ? config.random : Math.random
    let definitions = {}
    let townsById = new Map()
    let pool = []
    let openTownId = null

    function heroNamesOnMap(current) {
      return Object.keys(current.heroes)
        .filter((heroId) => !current.heroes[heroId].removed)
        .map((heroId) => heroById(current, heroId)?.name)
    }

    function hasTavern(townId) {
      const current = state.get()
      return (
        townOwner(current, townId) === activePlayer(current) &&
        builtIn(current, townId).has('TAVERN')
      )
    }

    function offerHeroes({ player, kept, rumour, hiredName }) {
      return {
        type: APP_FACT_TAVERN_HEROES_OFFERED,
        detail: {
          player,
          heroes: rollHeroesForHire({
            pool,
            heroClasses: definitions.heroClasses,
            heroNamesOnMap: [...heroNamesOnMap(state.get()), ...(hiredName ? [hiredName] : [])],
            kept,
            isReplacement: Boolean(hiredName),
            random
          }),
          rumour
        }
      }
    }

    function hiringAllowed(townId) {
      const current = state.get()
      const player = townOwner(current, townId)
      return canHire({
        resources: resourcesOf(current, player),
        cost: definitions.tavern?.cost,
        heroCount: heroIdsOf(current, player).length,
        isHeroInTown: heroIdAt(current, townsById.get(townId).tile) !== null
      })
    }

    function describeHero(hero, slot) {
      const withSkills = { ...hero, secondarySkills: startingSecondarySkills(hero, definitions) }
      return {
        slot,
        name: hero.name,
        description: describeHeroForHire(hero, definitions.heroClasses),
        skills: getHeroPrimarySkills({ entity: hero, definitions }),
        morale: getHeroMorale({ entity: withSkills, definitions }),
        luck: getHeroLuck({ entity: withSkills, definitions }),
        spellPoints: maxSpellPoints({ entity: withSkills, definitions }),
        army: getHeroArmy({ entity: hero, definitions })
      }
    }

    function showTavern() {
      const current = state.get()
      const offer = tavernOf(current, townOwner(current, openTownId))
      emit(APP_UI_TAVERN_UPDATED, {
        entityId: openTownId,
        rumour: rumourText(definitions.tavern, offer?.rumour),
        heroes: (offer?.heroes ?? [])
          .map((hero, slot) => hero && describeHero(hero, slot))
          .filter(Boolean),
        cost: definitions.tavern?.cost?.GOLD_PILE ?? 0,
        canHire: hiringAllowed(openTownId)
      })
    }

    function open(townId) {
      if (!townsById.has(townId) || !hasTavern(townId)) {
        return
      }

      openTownId = townId
      const player = townOwner(state.get(), townId)
      if (tavernOf(state.get(), player)) {
        showTavern()
        return
      }

      const kept = Array.from({ length: HEROES_FOR_HIRE }, () => null)
      emitAll([offerHeroes({ player, kept, rumour: rollRumour(definitions.tavern, random) })])
    }

    function hire(townId, slot) {
      const current = state.get()
      const player = townOwner(current, townId)
      const offer = tavernOf(current, player)
      const hero = offer?.heroes[slot]
      if (!hero || !hasTavern(townId) || !hiringAllowed(townId)) {
        return
      }

      const heroId = `${HIRED_HERO_ID_PREFIX}${Object.keys(current.heroes).length + 1}`
      const kept = offer.heroes.map((offered, index) => (index === slot ? null : offered))
      emitAll([
        {
          type: APP_FACT_RESOURCES_SPENT,
          detail: {
            player,
            resources: { ...definitions.tavern.cost },
            reason: 'tavern.hire',
            entityId: townId
          }
        },
        {
          type: APP_FACT_HERO_HIRED,
          detail: { heroId, player, tile: townsById.get(townId).tile, entityId: townId, ...hero }
        },
        offerHeroes({ player, kept, rumour: offer.rumour, hiredName: hero.name }),
        { type: APP_FACT_HERO_SELECTED, detail: { heroId, player } }
      ])
    }

    function showIfOpen() {
      if (openTownId) {
        showTavern()
      }
    }

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            definitions = event.detail.definitions ?? {}
            const { entities } = event.detail.scenario
            townsById = new Map(entities.filter(isTown).map((town) => [town.id, town]))
            const startingHeroes = entities
              .filter(isHero)
              .map(({ id }) => heroById(state.get(), id))
              .filter(Boolean)
              .map(({ name, heroClass }) => ({ name, heroClass }))
            pool = heroPool(definitions.heroes, startingHeroes)
            openTownId = null
          }
        },
        {
          type: APP_COMMAND_TAVERN_OPEN_REQUESTED,
          handler: (event) => open(event.detail.entityId)
        },
        {
          type: APP_COMMAND_TAVERN_HIRE_REQUESTED,
          handler: (event) => {
            if (event.detail.entityId === openTownId) {
              hire(event.detail.entityId, event.detail.slot)
            }
          }
        },
        { type: APP_FACT_TAVERN_HEROES_OFFERED, handler: showIfOpen },
        { type: APP_FACT_RESOURCES_SPENT, handler: showIfOpen },
        {
          type: APP_FACT_HERO_HIRED,
          handler: () => {
            openTownId = null
          }
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
    id: 'tavern',
    phase: 'domain',
    consumes: [
      APP_FACT_WORLD_READY,
      APP_COMMAND_TAVERN_OPEN_REQUESTED,
      APP_COMMAND_TAVERN_HIRE_REQUESTED,
      APP_FACT_TAVERN_HEROES_OFFERED,
      APP_FACT_RESOURCES_SPENT,
      APP_FACT_HERO_HIRED,
      APP_FACT_TOWN_LEFT
    ],
    produces: [
      APP_FACT_TAVERN_HEROES_OFFERED,
      APP_FACT_RESOURCES_SPENT,
      APP_FACT_HERO_HIRED,
      APP_FACT_HERO_SELECTED,
      APP_UI_TAVERN_UPDATED
    ]
  }
)
