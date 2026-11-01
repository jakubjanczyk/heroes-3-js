// Typed arrays can't be frozen, so they are left as they are and only read by convention.
export function deepFreeze(value) {
  if (
    value === null ||
    typeof value !== 'object' ||
    ArrayBuffer.isView(value) ||
    Object.isFrozen(value)
  ) {
    return value
  }

  Object.freeze(value)
  for (const key of Reflect.ownKeys(value)) {
    deepFreeze(value[key])
  }

  return value
}
