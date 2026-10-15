export function typeToClass(type) {
  if (typeof type !== 'string' || type.length === 0) {
    return null;
  }

  return type.toLowerCase().replaceAll('_', '-');
}
