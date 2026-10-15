export function getDefinitionForEntity({ entity, definitions, definitionsKey }) {
  const byType = definitions?.[definitionsKey] ?? {};
  const entityType = entity?.type;
  if (typeof entityType !== 'string' || entityType.length < 1) {
    return null;
  }

  return byType[entityType] ?? null;
}

export function getEntityName({ entity, definitions, definitionsKey, defaultName }) {
  const definition = getDefinitionForEntity({ entity, definitions, definitionsKey });
  return definition?.name ?? defaultName;
}
