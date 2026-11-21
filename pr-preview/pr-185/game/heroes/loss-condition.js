import { heroIdsOf, turnNumber } from '../state/queries.js'
import { heroById } from './state/hero-details.js'
import { isLossTownHeld, lossConditionOf, lossTownName } from './state/scenario-goal.js'
import { townOwner } from './state/towns.js'

const conditions = {
  loseTown: {
    isMetBy: (state, player, { town }) =>
      isLossTownHeld(state) && townOwner(state, town) !== player,
    message: (state) => `The town of ${lossTownName(state)} has fallen - all is lost!`
  },
  loseHero: {
    isMetBy: (state, player, { hero }) => !heroIdsOf(state, player).includes(hero),
    message: (state, { hero }) =>
      `The hero, ${heroById(state, hero)?.name}, has suffered defeat - your quest is over!`
  },
  timeExpires: {
    isMetBy: (state, _player, { days }) => turnNumber(state) > days,
    message: () => 'Alas, time has run out on your quest. All is lost.'
  }
}

export function isLossConditionMet(state, player) {
  const condition = lossConditionOf(state)
  return conditions[condition?.type]?.isMetBy(state, player, condition) ?? false
}

export function lossMessage(state) {
  const condition = lossConditionOf(state)
  return conditions[condition.type].message(state, condition)
}
