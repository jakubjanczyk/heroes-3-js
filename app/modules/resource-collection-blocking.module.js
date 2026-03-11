import {
  APP_FACT_RESOURCE_COLLECTED,
  APP_FACT_RESOURCE_COLLECTION_BLOCKING_CHANGED,
  APP_FACT_WORLD_READY,
  APP_UI_RESOURCE_COLLECTION_STARTED
} from '../events.js';
import { defineModule } from './shared/module-runtime.js';

function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
}

export const registerResourceCollectionBlockingModule = defineModule(({ on, emit }) => {
  const blockedEntityIds = new Set();

  function emitBlockedEntityIds() {
    emit(APP_FACT_RESOURCE_COLLECTION_BLOCKING_CHANGED, {
      entityIds: [...blockedEntityIds]
    });
  }

  on(APP_FACT_WORLD_READY, () => {
    blockedEntityIds.clear();
    emitBlockedEntityIds();
  });

  on(APP_UI_RESOURCE_COLLECTION_STARTED, (event) => {
    const entityId = event.detail?.entityId;
    if (!isNonEmptyString(entityId) || blockedEntityIds.has(entityId)) {
      return;
    }

    blockedEntityIds.add(entityId);
    emitBlockedEntityIds();
  });

  on(APP_FACT_RESOURCE_COLLECTED, (event) => {
    const entityId = event.detail?.entityId;
    if (!isNonEmptyString(entityId) || !blockedEntityIds.has(entityId)) {
      return;
    }

    blockedEntityIds.delete(entityId);
    emitBlockedEntityIds();
  });
});
