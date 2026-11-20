import { deepFreeze } from './deep-freeze.js'

export function createStore(applyFact, initialValue = null) {
  let value = initialValue

  return {
    get: () => value,
    apply(fact) {
      value = deepFreeze(applyFact(value, fact))
    }
  }
}
