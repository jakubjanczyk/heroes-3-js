function toFiniteInteger(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.floor(parsed);
}

export function normalizeTile(tile) {
  const x = toFiniteInteger(tile?.x);
  const y = toFiniteInteger(tile?.y);
  if (x === null || y === null) {
    return null;
  }

  return {
    x,
    y
  };
}
