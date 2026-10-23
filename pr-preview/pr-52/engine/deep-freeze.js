export function deepFreeze(value) {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) {
    return value
  }

  Object.freeze(value)
  for (const key of Reflect.ownKeys(value)) {
    deepFreeze(value[key])
  }

  return value
}
