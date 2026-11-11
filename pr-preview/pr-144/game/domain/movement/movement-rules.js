// Content can pass its own movement rules. Without them every step costs 1 movement point.
const ONE_POINT_PER_STEP = Object.freeze({
  stepCost: () => 1,
  chargeSteps: ({ path, remainingMovementPoints }) => {
    const stepCount = Math.max(0, path.length - 1)
    const affordableSteps = Math.min(stepCount, Math.max(0, Math.floor(remainingMovementPoints)))
    return new Array(affordableSteps).fill(1)
  },
  flightOf: () => null
})

// `stepCost({ map, from, to, flight, canLand })` is what the route search minimises.
// `chargeSteps({ map, path, remainingMovementPoints, flight, canLand })` lists what each step of
// `path` the hero can still take today costs; steps beyond it wait for another day.
// `flightOf(state, heroId)` is the hero's flight today, or null when they walk. A flying hero
// crosses tiles they can't land on (`canLand(tile)` is false) as long as they land again today.
export function resolveMovementRules(rules) {
  return {
    stepCost: rules?.stepCost ?? ONE_POINT_PER_STEP.stepCost,
    chargeSteps: rules?.chargeSteps ?? ONE_POINT_PER_STEP.chargeSteps,
    flightOf: rules?.flightOf ?? ONE_POINT_PER_STEP.flightOf
  }
}
