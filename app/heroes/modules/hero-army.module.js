import {
  moveStack,
  sendAllStacks,
  sendStack,
  splitStack,
  swapArmies
} from '../../../game/heroes/army-exchange.js'
import { heroById } from '../../../game/heroes/state/hero-details.js'
import { selectedHeroIdOf, viewingPlayer } from '../../../game/state/queries.js'
import {
  APP_COMMAND_HERO_STACK_MOVE_REQUESTED,
  APP_COMMAND_HERO_STACK_SPLIT_REQUESTED,
  APP_COMMAND_HEROES_ARMIES_SWAP_REQUESTED,
  APP_COMMAND_HEROES_ARMY_SEND_REQUESTED,
  APP_COMMAND_HEROES_STACK_MOVE_REQUESTED,
  APP_COMMAND_HEROES_STACK_SEND_REQUESTED,
  APP_COMMAND_HEROES_STACK_SPLIT_REQUESTED,
  APP_FACT_HERO_ARMY_CHANGED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

const ARMY_SIDES = ['left', 'right']

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

    function exchange(heroIds, exchangeArmies) {
      const heroes = ARMY_SIDES.map((side) => heroById(state.get(), heroIds?.[side]))
      if (heroes.some((hero) => !hero) || heroes[0].id === heroes[1].id) {
        return
      }

      const armies = { left: heroes[0].army, right: heroes[1].army }
      const changed = exchangeArmies(armies)
      if (!changed) {
        return
      }
      ARMY_SIDES.forEach((side, index) => {
        if (changed[side] !== armies[side]) {
          emit(APP_FACT_HERO_ARMY_CHANGED, { heroId: heroes[index].id, army: changed[side] })
        }
      })
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
        },
        {
          type: APP_COMMAND_HEROES_STACK_MOVE_REQUESTED,
          handler: ({ detail: { heroIds, from, to } }) =>
            exchange(heroIds, (armies) => moveStack(armies, from, to))
        },
        {
          type: APP_COMMAND_HEROES_STACK_SPLIT_REQUESTED,
          handler: ({ detail: { heroIds, from, to, count } }) =>
            exchange(heroIds, (armies) => splitStack(armies, from, to, count))
        },
        {
          type: APP_COMMAND_HEROES_STACK_SEND_REQUESTED,
          handler: ({ detail: { heroIds, from, toArmy } }) =>
            exchange(heroIds, (armies) => sendStack(armies, from, toArmy))
        },
        {
          type: APP_COMMAND_HEROES_ARMY_SEND_REQUESTED,
          handler: ({ detail: { heroIds, fromArmy, toArmy } }) =>
            exchange(heroIds, (armies) => sendAllStacks(armies, fromArmy, toArmy))
        },
        {
          type: APP_COMMAND_HEROES_ARMIES_SWAP_REQUESTED,
          handler: ({ detail: { heroIds } }) =>
            exchange(heroIds, (armies) => swapArmies(armies, 'left', 'right'))
        }
      ]
    }
  },
  {
    id: 'hero-army',
    phase: 'domain',
    consumes: [
      APP_COMMAND_HERO_STACK_MOVE_REQUESTED,
      APP_COMMAND_HERO_STACK_SPLIT_REQUESTED,
      APP_COMMAND_HEROES_STACK_MOVE_REQUESTED,
      APP_COMMAND_HEROES_STACK_SPLIT_REQUESTED,
      APP_COMMAND_HEROES_STACK_SEND_REQUESTED,
      APP_COMMAND_HEROES_ARMY_SEND_REQUESTED,
      APP_COMMAND_HEROES_ARMIES_SWAP_REQUESTED
    ],
    produces: [APP_FACT_HERO_ARMY_CHANGED]
  }
)
