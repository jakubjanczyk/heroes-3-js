import {
  APP_FACT_MONSTER_DEFEATED,
  APP_FACT_RESOURCE_COLLECTED,
  APP_FACT_TOWN_VISITED,
  APP_UI_INTERACTION_MODAL_OPENED,
  APP_UI_RESOURCE_COLLECTION_STARTED
} from '../../events.js';

function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
}

async function finalizeMonsterDefeat({
  interactions,
  bus,
  outcome,
  requestEntityFadeOut,
  fadeOutMs
}) {
  await requestEntityFadeOut({
    entityId: outcome.entityId,
    entityKind: 'MONSTER',
    durationMs: fadeOutMs
  });

  const didFinalize = interactions.finalizeMonsterDefeat({ entityId: outcome.entityId });
  if (!didFinalize) {
    return;
  }

  bus.emit(APP_FACT_MONSTER_DEFEATED, {
    entityId: outcome.entityId,
    entityType: outcome.entityType,
    tile: outcome.tile
  });
}

async function finalizeResourceCollection({
  interactions,
  bus,
  outcome,
  requestEntityFadeOut,
  fadeOutMs
}) {
  bus.emit(APP_UI_RESOURCE_COLLECTION_STARTED, {
    entityId: outcome.entityId,
    entityType: outcome.entityType,
    tile: outcome.tile
  });

  await requestEntityFadeOut({
    entityId: outcome.entityId,
    entityKind: 'RESOURCE',
    durationMs: fadeOutMs
  });

  const didFinalize =
    interactions.finalizeResourceCollection?.({ entityId: outcome.entityId }) ?? false;
  if (!didFinalize) {
    return;
  }

  bus.emit(APP_FACT_RESOURCE_COLLECTED, {
    entityId: outcome.entityId,
    entityType: outcome.entityType,
    amount: outcome.amount,
    tile: outcome.tile
  });
}

function openModal({ bus, outcome }) {
  bus.emit(APP_UI_INTERACTION_MODAL_OPENED, {
    interactionKind: outcome.kind,
    entityId: outcome.entityId,
    entityType: outcome.entityType,
    title: outcome.modal.title,
    message: outcome.modal.message
  });
}

const handlersByKind = Object.freeze({
  MONSTER_DEFEATED: Object.freeze({
    kind: 'MONSTER_DEFEATED',
    opensModal: true,
    onOutcome({ bus, outcome }) {
      openModal({ bus, outcome });
      return {
        pendingModalOutcome: outcome
      };
    },
    async onModalClosed({ bus, interactions, outcome, requestEntityFadeOut, config }) {
      await finalizeMonsterDefeat({
        interactions,
        bus,
        outcome,
        requestEntityFadeOut,
        fadeOutMs: config.monsterDefeatFadeOutMs
      });
    }
  }),
  RESOURCE_COLLECTED: Object.freeze({
    kind: 'RESOURCE_COLLECTED',
    opensModal: false,
    async onOutcome({ bus, interactions, outcome, requestEntityFadeOut, config }) {
      await finalizeResourceCollection({
        interactions,
        bus,
        outcome,
        requestEntityFadeOut,
        fadeOutMs: config.resourceCollectFadeOutMs
      });
      return null;
    }
  }),
  TOWN_VISITED: Object.freeze({
    kind: 'TOWN_VISITED',
    opensModal: true,
    onOutcome({ bus, outcome }) {
      openModal({ bus, outcome });
      bus.emit(APP_FACT_TOWN_VISITED, {
        entityId: outcome.entityId,
        entityType: outcome.entityType,
        tile: outcome.tile
      });
      return {
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
