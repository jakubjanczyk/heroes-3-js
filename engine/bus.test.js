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

  test('removeEventListener unsubscribes a listener', () => {
    const bus = createBus();
    const received = [];

    function listener(event) {
      received.push(event);
    }

    bus.addEventListener('test-event', listener);
    bus.removeEventListener('test-event', listener);
    bus.emit('test-event', { value: 123 });

    expect(received).toEqual([]);
  });

  test('removeAllEventListeners removes only one event type when provided', () => {
    const bus = createBus();
    const received = [];

    bus.addEventListener('event-a', (event) => {
      received.push(`a:${event.detail.value}`);
    });
    bus.addEventListener('event-b', (event) => {
      received.push(`b:${event.detail.value}`);
    });

    bus.removeAllEventListeners('event-a');
    bus.emit('event-a', { value: 1 });
    bus.emit('event-b', { value: 2 });

    expect(received).toEqual(['b:2']);
  });

  test('removeAllEventListeners without type clears all listeners', () => {
    const bus = createBus();
    const received = [];

    bus.addEventListener('event-a', (event) => {
      received.push(`a:${event.detail.value}`);
    });
    bus.addEventListener('event-b', (event) => {
      received.push(`b:${event.detail.value}`);
    });

    bus.removeAllEventListeners();
    bus.emit('event-a', { value: 1 });
    bus.emit('event-b', { value: 2 });

    expect(received).toEqual([]);
  });
});
