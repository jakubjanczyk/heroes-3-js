import {
  APP_FACT_RESOURCE_COLLECTED,
  APP_FACT_RESOURCE_COLLECTION_BLOCKING_CHANGED,
  APP_FACT_WORLD_READY,
  APP_UI_RESOURCE_COLLECTION_STARTED
} from '../events.js';

function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
}

export function registerResourceCollectionBlockingModule({ bus }) {
  const blockedEntityIds = new Set();

  function emitBlockedEntityIds() {
    bus.emit(APP_FACT_RESOURCE_COLLECTION_BLOCKING_CHANGED, {
      entityIds: [...blockedEntityIds]
    });
  }

  bus.addEventListener(APP_FACT_WORLD_READY, () => {
    blockedEntityIds.clear();
    emitBlockedEntityIds();
  });

  bus.addEventListener(APP_UI_RESOURCE_COLLECTION_STARTED, (event) => {
    const entityId = event.detail?.entityId;
    if (!isNonEmptyString(entityId) || blockedEntityIds.has(entityId)) {
      return;
    }

    blockedEntityIds.add(entityId);
    emitBlockedEntityIds();
  });

  bus.addEventListener(APP_FACT_RESOURCE_COLLECTED, (event) => {
    const entityId = event.detail?.entityId;
    if (!isNonEmptyString(entityId) || !blockedEntityIds.has(entityId)) {
      return;
    }

    blockedEntityIds.delete(entityId);
    emitBlockedEntityIds();
  });
}
