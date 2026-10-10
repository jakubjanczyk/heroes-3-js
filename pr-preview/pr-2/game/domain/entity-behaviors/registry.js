import { mineBehavior } from './mine.js';
import { monsterBehavior } from './monster.js';
import { resourceBehavior } from './resource.js';
import { townBehavior } from './town.js';

const behaviorByKind = Object.freeze({
  [mineBehavior.kind]: mineBehavior,
  [monsterBehavior.kind]: monsterBehavior,
  [resourceBehavior.kind]: resourceBehavior,
  [townBehavior.kind]: townBehavior
});

export function getEntityBehavior(entity) {
  const kind = entity?.kind;
  if (typeof kind !== 'string' || kind.length < 1) {
    return null;
  }

  return behaviorByKind[kind] ?? null;
}

export function getArrivalInteraction(entity) {
  return getEntityBehavior(entity)?.arrivalInteraction ?? null;
}
