function assertUniqueKeys(slices) {
  const keys = new Set()
  for (const { key } of slices) {
    if (keys.has(key)) {
      throw new Error(`Two state slices have the key "${key}"`)
    }

    keys.add(key)
  }
}

export function combineSlices(slices) {
  assertUniqueKeys(slices)

  function initialGameState(world) {
    return Object.fromEntries(slices.map((slice) => [slice.key, slice.initial(world)]))
  }

  // `world` is what the state started from: the scenario, the definitions and the config.
  function applyFact(state, { type, detail }, world) {
    if (!state) {
      return state
    }

    const context = { ...world, previousState: state }
    const changed = {}
    for (const slice of slices) {
      const apply = slice.on[type]
      const value = apply ? apply(state[slice.key], detail ?? {}, context) : state[slice.key]
      if (value !== state[slice.key]) {
        changed[slice.key] = value
      }
    }

    return Object.keys(changed).length > 0 ? { ...state, ...changed } : state
  }

  return {
    initialGameState,
    applyFact,
    factTypes: new Set(slices.flatMap((slice) => Object.keys(slice.on)))
  }
}
