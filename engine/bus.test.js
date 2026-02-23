import { describe, expect, test } from 'vitest';

import { createBus } from './bus.js';

describe('event bus', () => {
  test('emits event to subscribers', () => {
    const bus = createBus();
    const received = [];

    bus.addEventListener('test-event', (event) => {
      received.push(event);
    });

    bus.emit('test-event', { value: 123 });

    expect(received).toEqual([
      { type: 'test-event', detail: { value: 123 } }
    ]);
  });
});
