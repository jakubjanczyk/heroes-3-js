// Content can pass its own movement rules. Without them every step costs 1 movement point.
const ONE_POINT_PER_STEP = Object.freeze({
  stepCost: () => 1,
  chargeSteps: ({ path, remainingMovementPoints }) => {
    const stepCount = Math.max(0, path.length - 1)
    const affordableSteps = Math.min(stepCount, Math.max(0, Math.floor(remainingMovementPoints)))
    return new Array(affordableSteps).fill(1)
  }
})

// `stepCost({ map, from, to })` is what the route search minimises.
// `chargeSteps({ map, path, remainingMovementPoints })` lists what each step of `path` the hero
// can still take today costs; steps beyond it wait for another day.
export function resolveMovementRules(rules) {
  return {
    stepCost: rules?.stepCost ?? ONE_POINT_PER_STEP.stepCost,
    chargeSteps: rules?.chargeSteps ?? ONE_POINT_PER_STEP.chargeSteps
  }
}
