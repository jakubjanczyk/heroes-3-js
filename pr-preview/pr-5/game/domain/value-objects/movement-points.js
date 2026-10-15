function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function toMovementPointsOrNull(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.floor(parsed);
}

export function normalizeMovementPoints(value, {
  min = 0,
  max = Number.POSITIVE_INFINITY,
  fallback = null
} = {}) {
  const normalizedMin = Number.isFinite(min) ? min : 0;
  const normalizedMax = Number.isFinite(max) ? max : Number.POSITIVE_INFINITY;
  const parsed = toMovementPointsOrNull(value);

  if (parsed === null) {
    if (fallback === null) {
      return null;
    }

    const fallbackValue = toMovementPointsOrNull(fallback);
    if (fallbackValue === null) {
      return null;
    }

    return clamp(fallbackValue, normalizedMin, normalizedMax);
  }

  return clamp(parsed, normalizedMin, normalizedMax);
}
