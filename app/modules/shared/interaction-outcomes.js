import {
  APP_FACT_MONSTER_DEFEATED,
  APP_FACT_RESOURCE_COLLECTED,
  APP_FACT_TOWN_VISITED
} from '../../events.js';
import {
  INTERACTION_OUTCOME_KIND_MONSTER_DEFEATED,
  INTERACTION_OUTCOME_KIND_RESOURCE_COLLECTED,
  INTERACTION_OUTCOME_KIND_TOWN_VISITED
} from '../../../game/domain/interaction-kinds.js';

function toModal(outcome) {
  return {
    interactionKind: outcome.kind,
    entityId: outcome.entityId,
    entityType: outcome.entityType,
    title: outcome.modal.title,
    message: outcome.modal.message
  };
}

function toEntityFactDetail(outcome) {
  return {
    entityId: outcome.entityId,
    entityType: outcome.entityType,
    tile: outcome.tile
  };
}

const effectsByOutcomeKind = Object.freeze({
  [INTERACTION_OUTCOME_KIND_MONSTER_DEFEATED]: (outcome) => ({
    modal: toModal(outcome),
    factsOnModalClosed: [
      { type: APP_FACT_MONSTER_DEFEATED, detail: toEntityFactDetail(outcome) }
    ]
  }),
  [INTERACTION_OUTCOME_KIND_RESOURCE_COLLECTED]: (outcome) => ({
    facts: [
      {
        type: APP_FACT_RESOURCE_COLLECTED,
        detail: { ...toEntityFactDetail(outcome), amount: outcome.amount }
      }
    ]
  }),
  [INTERACTION_OUTCOME_KIND_TOWN_VISITED]: (outcome) => ({
    facts: [{ type: APP_FACT_TOWN_VISITED, detail: toEntityFactDetail(outcome) }],
    modal: toModal(outcome)
  })
});

export function getInteractionEffects(outcome) {
  return effectsByOutcomeKind[outcome?.kind]?.(outcome) ?? null;
}
