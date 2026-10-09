import { isNonEmptyString } from '../string-utils.js';

export function toEntityIdOrNull(value) {
  if (!isNonEmptyString(value)) {
    return null;
  }

  return value;
}

export function isEntityId(value) {
  return toEntityIdOrNull(value) !== null;
}
