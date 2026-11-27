import { getHexBeyond, getHexNeighbours, getOccupiedHexes, isSameHex } from './battlefield.js'

const touches = (hex, other) =>
  getHexNeighbours(hex, { withEdges: true }).some((neighbour) => isSameHex(neighbour, other))

const isOn = (stack, hex) => getOccupiedHexes(stack).some((own) => isSameHex(own, hex))

// The attacker breathes from the hex it attacks from; a stack striking back from its front hex when
// both its halves touch the attacker. When both halves of the struck stack touch that hex, the
// breath goes through its back half.
function breathLine(striker, struck, { attackerId, fromHex }) {
  const struckHexes = getOccupiedHexes(struck)
  const origin =
    striker.id === attackerId
      ? fromHex
      : getOccupiedHexes(striker).find((own) => struckHexes.some((hex) => touches(own, hex)))
  const through = origin && struckHexes.filter((hex) => touches(origin, hex)).at(-1)
  return through ? getHexBeyond(origin, through) : null
}

export const breathTargetFinder = (stacks, attack) => (striker, struck) => {
  const beyond = breathLine(striker, struck, attack)
  return (
    (beyond &&
      stacks.find(
        (stack) =>
          stack.count > 0 &&
          stack.id !== striker.id &&
          stack.id !== struck.id &&
          isOn(stack, beyond)
      )) ??
    null
  )
}
