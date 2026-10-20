import { ARMY_SLOT_COUNT } from './hero-army.js'

// A neutral monster splits into several stacks in battle, as in Heroes 3 (VCMI
// `CGCreature::fight` and `getNumberOfStacks`, from the Heroes Community research).

// An army's strength: each creature's AI value times its count.
export function getArmyStrength(army, definitions) {
  return army
    .filter(Boolean)
    .reduce(
      (sum, { creature, count }) => sum + (definitions?.monsters?.[creature]?.aiValue ?? 0) * count,
      0
    )
}

// A number from 0 to 32767 made from the monster's tile, the same every time it is fought.
function hashTile({ x, y, z = 0 }) {
  const mixed =
    (Math.imul(1550811371, x) +
      Math.imul(3359066809, y) +
      Math.imul(1943276003, z) +
      3174620878) >>>
    0
  return (mixed >>> 16) & 0x7fff
}

// The weaker the hero's army against the monster, the more stacks; some tiles make one fewer or
// one more.
function countStacksByStrength({ heroStrength, monsterStrength, tile }) {
  const ratio = monsterStrength > 0 ? heroStrength / monsterStrength : Number.POSITIVE_INFINITY
  let stacks = 2
  if (ratio < 0.5) {
    stacks = 7
  } else if (ratio < 0.67) {
    stacks = 6
  } else if (ratio < 1) {
    stacks = 5
  } else if (ratio < 1.5) {
    stacks = 4
  } else if (ratio < 2) {
    stacks = 3
  }

  const roll = (hashTile(tile) % 100) + 1
  if (roll <= 20) {
    return stacks - 1
  }

  return roll >= 80 ? stacks + 1 : stacks
}

// `monster.stacks` is the number a map sets; otherwise it comes from the armies' strength.
// The creatures are shared out evenly, the first stacks taking one more when they don't divide.
export function splitMonster({ monster, heroArmy, tile, definitions }) {
  const { creature, count } = monster
  const wanted =
    monster.stacks ??
    countStacksByStrength({
      heroStrength: getArmyStrength(heroArmy ?? [], definitions),
      monsterStrength: getArmyStrength([monster], definitions),
      tile
    })
  const stackCount = Math.max(1, Math.min(wanted, count, ARMY_SLOT_COUNT))
  const smaller = Math.floor(count / stackCount)
  const biggerCount = count - smaller * stackCount
  return Array.from({ length: stackCount }, (_, index) => ({
    creature,
    count: index < biggerCount ? smaller + 1 : smaller
  }))
}
