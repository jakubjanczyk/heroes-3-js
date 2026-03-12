import {
  APP_FACT_MONSTER_DEFEATED,
  APP_FACT_RESOURCE_COLLECTED,
  APP_FACT_TOWN_VISITED,
  APP_UI_INTERACTION_MODAL_OPENED,
  APP_UI_RESOURCE_COLLECTION_STARTED
} from '../../events.js';
import {
  INTERACTION_OUTCOME_KIND_MONSTER_DEFEATED,
  INTERACTION_OUTCOME_KIND_RESOURCE_COLLECTED,
  INTERACTION_OUTCOME_KIND_TOWN_VISITED
} from '../../../game/domain/interaction-kinds.js';
import { isNonEmptyString } from '../../../game/domain/string-utils.js';

function toModalOpenedEvent(outcome) {
  return {
    type: APP_UI_INTERACTION_MODAL_OPENED,
    detail: {
      interactionKind: outcome.kind,
      entityId: outcome.entityId,
      entityType: outcome.entityType,
      title: outcome.modal.title,
      message: outcome.modal.message
    }
  };
}

const handlersByKind = Object.freeze({
  [INTERACTION_OUTCOME_KIND_MONSTER_DEFEATED]: Object.freeze({
    kind: INTERACTION_OUTCOME_KIND_MONSTER_DEFEATED,
    opensModal: true,
    onOutcome({ outcome }) {
      return {
        preEvents: [toModalOpenedEvent(outcome)],
        pendingModalOutcome: outcome
      };
    },
    onModalClosed({ outcome, config }) {
      return {
        fadeOut: {
          entityId: outcome.entityId,
          entityKind: 'MONSTER',
          durationMs: config.monsterDefeatFadeOutMs
        },
        finalizeMethod: 'finalizeMonsterDefeat',
        postEvents: [
          {
            type: APP_FACT_MONSTER_DEFEATED,
            detail: {
              entityId: outcome.entityId,
              entityType: outcome.entityType,
              tile: outcome.tile
            }
          }
        ]
      };
    }
  }),
  [INTERACTION_OUTCOME_KIND_RESOURCE_COLLECTED]: Object.freeze({
    kind: INTERACTION_OUTCOME_KIND_RESOURCE_COLLECTED,
    opensModal: false,
    onOutcome({ outcome, config }) {
      return {
        preEvents: [
          {
            type: APP_UI_RESOURCE_COLLECTION_STARTED,
            detail: {
              entityId: outcome.entityId,
              entityType: outcome.entityType,
              tile: outcome.tile
            }
          }
        ],
        fadeOut: {
          entityId: outcome.entityId,
          entityKind: 'RESOURCE',
          durationMs: config.resourceCollectFadeOutMs
        },
        finalizeMethod: 'finalizeResourceCollection',
        postEvents: [
          {
            type: APP_FACT_RESOURCE_COLLECTED,
            detail: {
              entityId: outcome.entityId,
              entityType: outcome.entityType,
              amount: outcome.amount,
              tile: outcome.tile
            }
          }
        ]
      };
    }
  }),
  [INTERACTION_OUTCOME_KIND_TOWN_VISITED]: Object.freeze({
    kind: INTERACTION_OUTCOME_KIND_TOWN_VISITED,
    opensModal: true,
    onOutcome({ outcome }) {
      return {
        preEvents: [
          toModalOpenedEvent(outcome),
          {
            type: APP_FACT_TOWN_VISITED,
            detail: {
              entityId: outcome.entityId,
              entityType: outcome.entityType,
              tile: outcome.tile
            }
          }
        ],
        pendingModalOutcome: outcome
      };
    }
  })
});

export function getInteractionOutcomeHandler(outcomeKind) {
  if (!isNonEmptyString(outcomeKind)) {
    return null;
  }

  return handlersByKind[outcomeKind] ?? null;
}
