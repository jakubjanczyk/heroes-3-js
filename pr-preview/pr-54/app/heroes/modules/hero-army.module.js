import { findHero } from '../../../game/domain/entity-queries.js'
import { moveStack, splitStack } from '../../../game/heroes/army-exchange.js'
import {
  APP_COMMAND_HERO_STACK_MOVE_REQUESTED,
  APP_COMMAND_HERO_STACK_SPLIT_REQUESTED,
  APP_FACT_HERO_ARMY_CHANGED,
  APP_FACT_WORLD_READY
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

export const registerHeroArmyModule = defineModule(
  ({ emit }) => {
    let hero = null

    function rearrange(rearrangeArmies) {
      if (!hero) {
        return
      }

      const changed = rearrangeArmies({ hero: hero.army })
      if (changed) {
        emit(APP_FACT_HERO_ARMY_CHANGED, { heroId: hero.id, army: changed.hero })
      }
    }

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            hero = findHero(event.detail.scenario.entities)
          }
        },
        {
          type: APP_FACT_HERO_ARMY_CHANGED,
          handler: (event) => {
            hero = { ...hero, army: event.detail.army }
          }
        },
        {
          type: APP_COMMAND_HERO_STACK_MOVE_REQUESTED,
          handler: ({ detail: { from, to } }) => rearrange((armies) => moveStack(armies, from, to))
        },
        {
          type: APP_COMMAND_HERO_STACK_SPLIT_REQUESTED,
          handler: ({ detail: { from, to, count } }) =>
            rearrange((armies) => splitStack(armies, from, to, count))
        }
      ]
    }
  },
  {
    id: 'hero-army',
    phase: 'domain',
    consumes: [
      APP_FACT_WORLD_READY,
      APP_FACT_HERO_ARMY_CHANGED,
      APP_COMMAND_HERO_STACK_MOVE_REQUESTED,
      APP_COMMAND_HERO_STACK_SPLIT_REQUESTED
    ],
    produces: [APP_FACT_HERO_ARMY_CHANGED]
  }
)
