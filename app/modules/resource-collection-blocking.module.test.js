import { describe, expect, test } from 'vitest';

import {
  APP_FACT_RESOURCE_COLLECTED,
  APP_FACT_RESOURCE_COLLECTION_BLOCKING_CHANGED,
  APP_FACT_WORLD_READY,
  APP_UI_RESOURCE_COLLECTION_STARTED
} from '../events.js';
import { createFakeBus } from '../../tests/test-utils/fake-bus.js';
import { registerResourceCollectionBlockingModule } from './resource-collection-blocking.module.js';

describe('resource collection blocking module', () => {
  test('emits blocked entity ids on start and clear transitions', () => {
    const bus = createFakeBus();

    registerResourceCollectionBlockingModule({ bus });

    bus.emit(APP_FACT_WORLD_READY, {});
    bus.emit(APP_UI_RESOURCE_COLLECTION_STARTED, { entityId: 'resource-1' });
    bus.emit(APP_UI_RESOURCE_COLLECTION_STARTED, { entityId: 'resource-2' });
    bus.emit(APP_FACT_RESOURCE_COLLECTED, { entityId: 'resource-1' });

    const blockingFacts = bus.emitted.filter(
      (entry) => entry.type === APP_FACT_RESOURCE_COLLECTION_BLOCKING_CHANGED
    );

    expect(blockingFacts).toEqual([
      {
        type: APP_FACT_RESOURCE_COLLECTION_BLOCKING_CHANGED,
        detail: { entityIds: [] }
      },
      {
        type: APP_FACT_RESOURCE_COLLECTION_BLOCKING_CHANGED,
        detail: { entityIds: ['resource-1'] }
      },
      {
        type: APP_FACT_RESOURCE_COLLECTION_BLOCKING_CHANGED,
        detail: { entityIds: ['resource-1', 'resource-2'] }
      },
      {
        type: APP_FACT_RESOURCE_COLLECTION_BLOCKING_CHANGED,
        detail: { entityIds: ['resource-2'] }
      }
    ]);
  });
});
