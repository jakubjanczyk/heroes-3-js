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

export const registerResourceCollectionBlockingModule = defineModule(({ emit }) => {
  const blockedEntityIds = new Set();

  function emitBlockedEntityIds() {
    emit(APP_FACT_RESOURCE_COLLECTION_BLOCKING_CHANGED, {
      entityIds: [...blockedEntityIds]
    });
  }

  return {
    subscriptions: [
      {
        type: APP_FACT_WORLD_READY,
        handler: () => {
          blockedEntityIds.clear();
          emitBlockedEntityIds();
        }
      },
      {
        type: APP_UI_RESOURCE_COLLECTION_STARTED,
        handler: (event) => {
          const entityId = event.detail?.entityId;
          if (!isNonEmptyString(entityId) || blockedEntityIds.has(entityId)) {
            return;
          }

          blockedEntityIds.add(entityId);
          emitBlockedEntityIds();
        }
      },
      {
        type: APP_FACT_RESOURCE_COLLECTED,
        handler: (event) => {
          const entityId = event.detail?.entityId;
          if (!isNonEmptyString(entityId) || !blockedEntityIds.has(entityId)) {
            return;
          }

          blockedEntityIds.delete(entityId);
          emitBlockedEntityIds();
        }
      }
    ]
  };
}, {
  id: 'resource-collection-blocking',
  phase: 'domain',
  consumes: [
    APP_FACT_WORLD_READY,
    APP_UI_RESOURCE_COLLECTION_STARTED,
    APP_FACT_RESOURCE_COLLECTED
  ],
  produces: [
    APP_FACT_RESOURCE_COLLECTION_BLOCKING_CHANGED
  ]
});
