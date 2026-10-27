import { createStore } from '../engine/store.js'
import { combineSlices } from '../game/state/combine-slices.js'
import { CORE_SLICES } from '../game/state/core-slices.js'
import { APP_FACT_WORLD_READY, shouldPersistFactEvent } from './events.js'

export function gameStateSlices(content) {
  return [...CORE_SLICES, ...(content?.stateSlices ?? [])]
}

// Only saved facts change the state, so a reload builds the state the player had. The world being
// ready, emitted on every boot before the replay, starts it afresh.
export function createGameStateStore({ content, config }) {
  const { initialGameState, applyFact } = combineSlices(gameStateSlices(content))

  let world = null

  return createStore((state, fact) => {
    if (fact.type === APP_FACT_WORLD_READY) {
      world = { ...fact.detail, config }
      return initialGameState(world)
    }

    return shouldPersistFactEvent(fact.type) ? applyFact(state, fact, world) : state
  })
}
