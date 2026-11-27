import { canCastInBattle, isHelpful, isSpellTarget, spellTargeting } from './battle-spells.js'
import { fightsFor } from './battle-stats.js'
import { healingAt, lastingAt } from './spell-book.js'

const OTHER_SIDE = Object.freeze({ attacker: 'defender', defender: 'attacker' })

const isLiving = (stack) => stack.count > 0

const shoots = (stack) => stack.shooter && stack.shots > 0

const kingsReachedBy = (spell, skillLevel) =>
  spell.lasting?.effects?.kingsReached?.[skillLevel] ?? 0

// What a spell needs to be of any use, beyond the stacks it may go on.
const USEFUL_WHEN = Object.freeze({
  targetWalks: ({ target }) => !target.shooter,
  enemyWalks: ({ enemies }) => enemies.some((stack) => !stack.warMachine && !shoots(stack)),
  enemyShoots: ({ enemies }) => enemies.some(shoots),
  enemyHasHero: ({ battle, side }) => (battle.heroSides ?? []).includes(OTHER_SIDE[side]),
  enemyKingReached: ({ enemies, spell, skillLevel }) =>
    enemies.some(({ king }) => king && king <= kingsReachedBy(spell, skillLevel))
})

const isUseful = (spell, context) => !spell.usefulWhen || USEFUL_WHEN[spell.usefulWhen]?.(context)

const hasSpell = (stack, spellId) => (stack.spells ?? []).some((spell) => spell.spellId === spellId)

const hasCastsLeft = (caster) => Boolean(caster?.casts) && caster.castsLeft > 0

// The spells the caster can give the stack, in the order of its list: those it isn't immune to,
// doesn't have already and that would do something.
export function getCasterSpellIds(battle, caster, target) {
  const side = fightsFor(caster)
  if (
    !hasCastsLeft(caster) ||
    target.id === caster.id ||
    !isLiving(target) ||
    fightsFor(target) !== side
  ) {
    return []
  }
  const { skillLevel, spells } = caster.casts
  const enemies = battle.stacks.filter((stack) => isLiving(stack) && fightsFor(stack) !== side)
  return spells.filter((spellId) => {
    const spell = battle.definitions?.spells?.[spellId]
    return (
      canCastInBattle(spell) &&
      isHelpful(spell) &&
      !hasSpell(target, spellId) &&
      isSpellTarget(spellTargeting(spell, skillLevel), target, side) &&
      isUseful(spell, { battle, side, target, enemies, spell, skillLevel })
    )
  })
}

export const getCastTargets = (battle, caster) =>
  hasCastsLeft(caster)
    ? battle.stacks.filter((stack) => getCasterSpellIds(battle, caster, stack).length > 0)
    : []

function castOf(spell, { skillLevel, power }) {
  if (spell.heals) {
    return { healing: healingAt(spell, { skillLevel, power }) }
  }
  return lastingAt(spell, { skillLevel, power })
}

// One of the spells the stack can be given, each as likely.
export function planStackCast(battle, caster, { targetId, random }) {
  const target = battle.stacks.find(({ id }) => id === targetId)
  const spellIds = target ? getCasterSpellIds(battle, caster, target) : []
  if (spellIds.length === 0) {
    return null
  }
  const spellId = spellIds[Math.min(spellIds.length - 1, Math.floor(random() * spellIds.length))]
  const spell = battle.definitions.spells[spellId]
  return { targetId, spellId, ...castOf(spell, caster.casts) }
}
