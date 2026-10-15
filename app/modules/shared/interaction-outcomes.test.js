import { describe, expect, test } from 'vitest';

import {
  APP_FACT_ENTITY_REMOVED,
  APP_FACT_MONSTER_DEFEATED,
  APP_FACT_RESOURCE_COLLECTED,
  APP_FACT_TOWN_VISITED
} from '../../events.js';
import {
  INTERACTION_OUTCOME_KIND_MONSTER_DEFEATED,
  INTERACTION_OUTCOME_KIND_RESOURCE_COLLECTED,
  INTERACTION_OUTCOME_KIND_TOWN_VISITED
} from '../../../game/domain/interaction-kinds.js';
import { getInteractionEffects } from './interaction-outcomes.js';

const tile = { x: 1, y: 0 };
const modal = { title: 'Interaction', message: 'Done' };

function factTypes(facts) {
  return (facts ?? []).map((fact) => fact.type);
}

describe('interaction outcomes', () => {
  test('a removing outcome with a modal removes the entity when the modal closes', () => {
    const effects = getInteractionEffects({
      kind: INTERACTION_OUTCOME_KIND_MONSTER_DEFEATED,
      entityId: 'monster-1',
      tile,
      removesEntity: true,
      modal
    });

    expect(factTypes(effects.facts)).toEqual([]);
    expect(factTypes(effects.factsOnModalClosed)).toEqual([
      APP_FACT_MONSTER_DEFEATED,
      APP_FACT_ENTITY_REMOVED
    ]);
    expect(effects.factsOnModalClosed[1].detail).toEqual({ entityId: 'monster-1' });
  });

  test('a removing outcome without a modal removes the entity right away', () => {
    const effects = getInteractionEffects({
      kind: INTERACTION_OUTCOME_KIND_RESOURCE_COLLECTED,
      entityId: 'resource-1',
      tile,
      amount: 100,
      removesEntity: true
    });

    expect(factTypes(effects.facts)).toEqual([APP_FACT_RESOURCE_COLLECTED, APP_FACT_ENTITY_REMOVED]);
  });

  test('an outcome that keeps its entity emits no removal', () => {
    const effects = getInteractionEffects({
      kind: INTERACTION_OUTCOME_KIND_TOWN_VISITED,
      entityId: 'town-1',
      tile,
      modal
    });

    expect(factTypes(effects.facts)).toEqual([APP_FACT_TOWN_VISITED]);
    expect(effects.factsOnModalClosed).toBeUndefined();
  });
});
