import { isNonEmptyString } from '../string-utils.js'

export function toEntityIdOrNull(value) {
  if (!isNonEmptyString(value)) {
    return null
  }

  return value
}
