// What a human player starts with in Heroes 3 on Normal difficulty.
const NORMAL_STARTING_RESOURCES = {
  WOOD_PILE: 20,
  MERCURY_PILE: 10,
  ORE_PILE: 20,
  SULFUR_PILE: 10,
  CRYSTAL_PILE: 10,
  GEMS_PILE: 10,
  GOLD_PILE: 20000
}

// What a computer player starts with on Normal difficulty, whatever the scenario says.
export const COMPUTER_STARTING_RESOURCES = Object.freeze({
  WOOD_PILE: 10,
  MERCURY_PILE: 4,
  ORE_PILE: 10,
  SULFUR_PILE: 4,
  CRYSTAL_PILE: 4,
  GEMS_PILE: 4,
  GOLD_PILE: 7500
})

// The scenario's starting resources, or the Normal ones when it sets none. Missing types start at 0.
export function startingResourcesOf(scenario) {
  return scenario?.startingResources ?? NORMAL_STARTING_RESOURCES
}
