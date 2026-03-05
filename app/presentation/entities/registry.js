import * as hero from './hero.js';
import * as monster from './monster.js';
import * as resource from './resource.js';
import * as town from './town.js';

const presentationByKind = Object.freeze({
  HERO: hero,
  MONSTER: monster,
  RESOURCE: resource,
  TOWN: town
});

export function getEntityPresentation(entity) {
  const kind = entity?.kind;
  if (typeof kind !== 'string' || kind.length < 1) {
    return null;
  }

  return presentationByKind[kind] ?? null;
}

export function getEntityLayerStyle({ entity, map }) {
  const presentation = getEntityPresentation(entity);
  if (!presentation?.getEntityLayerStyle) {
    return null;
  }

  return presentation.getEntityLayerStyle({ entity, map });
}

export function getEntityFadeOutSpec({ entityKind }) {
  if (typeof entityKind !== 'string' || entityKind.length < 1) {
    return null;
  }

  const presentation = presentationByKind[entityKind] ?? null;
  return presentation?.fadeOut ?? null;
}
