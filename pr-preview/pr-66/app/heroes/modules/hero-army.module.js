import { moveStack, splitStack } from '../../../game/heroes/army-exchange.js'
import { heroById } from '../../../game/heroes/state/hero-details.js'
import { selectedHeroIdOf, viewingPlayer } from '../../../game/state/queries.js'
import {
  APP_COMMAND_HERO_STACK_MOVE_REQUESTED,
  APP_COMMAND_HERO_STACK_SPLIT_REQUESTED,
  APP_FACT_HERO_ARMY_CHANGED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

export const registerHeroArmyModule = defineModule(
  ({ emit, state }) => {
    function rearrange(rearrangeArmies) {
      const heroId = selectedHeroIdOf(state.get(), viewingPlayer(state.get()))
      const hero = heroById(state.get(), heroId)
      const changed = hero && rearrangeArmies({ hero: hero.army })
      if (changed) {
        emit(APP_FACT_HERO_ARMY_CHANGED, { heroId, army: changed.hero })
      }
    }

    return {
      subscriptions: [
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
    consumes: [APP_COMMAND_HERO_STACK_MOVE_REQUESTED, APP_COMMAND_HERO_STACK_SPLIT_REQUESTED],
    produces: [APP_FACT_HERO_ARMY_CHANGED]
  }
)
