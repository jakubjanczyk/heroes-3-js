import { describe, expect, test } from 'vitest';

import { createEventLog } from './eventlog.js';

describe('event log', () => {
  test('loads persisted entries and records new events with schema metadata', async () => {
    const storedEntries = [
      {
        id: 2,
        v: 1,
        type: 'fact.turn.ended',
        detail: { turnNumber: 2 },
        at: 1000
      }
    ];
    const addedEntries = [];

    const eventLog = createEventLog({
      now: () => 12345,
      openDatabase: async () => ({}),
      getAll: async () => storedEntries,
      add: async (_db, _storeName, value) => {
        addedEntries.push(value);
        return 3;
      },
      clear: async () => {}
    });

    await eventLog.init();

    expect(eventLog.hasExistingSession()).toBe(true);
    expect(eventLog.getAll()).toEqual(storedEntries);

    await eventLog.record({
      type: 'fact.hero.moved',
      detail: {
        from: { x: 0, y: 0 },
        to: { x: 1, y: 0 }
      }
    });

    expect(addedEntries).toEqual([
      {
        v: 1,
        type: 'fact.hero.moved',
        detail: {
          from: { x: 0, y: 0 },
          to: { x: 1, y: 0 }
        },
        at: 12345
      }
    ]);
    expect(eventLog.getAll()).toEqual([
      ...storedEntries,
      {
        id: 3,
        ...addedEntries[0]
      }
    ]);
  });

  test('falls back to in-memory mode when IndexedDB is unavailable', async () => {
    const eventLog = createEventLog({
      now: () => 222,
      openDatabase: async () => {
        throw new Error('no indexeddb');
      }
    });

    await eventLog.init();
    expect(eventLog.hasExistingSession()).toBe(false);

    await eventLog.record({ type: 'fact.turn.ended', detail: { turnNumber: 2 } });

    expect(eventLog.getAll()).toEqual([
      {
        id: 1,
        v: 1,
        type: 'fact.turn.ended',
        detail: { turnNumber: 2 },
        at: 222
      }
    ]);
  });

  test('reset clears cached and persisted entries', async () => {
    let clearCalls = 0;
    const eventLog = createEventLog({
      openDatabase: async () => ({}),
      getAll: async () => [
        {
          id: 1,
          v: 1,
          type: 'fact.hero.moved',
          detail: { from: { x: 0, y: 0 }, to: { x: 1, y: 0 } },
          at: 10
        }
      ],
      add: async () => 2,
      clear: async () => {
        clearCalls += 1;
      }
    });

    await eventLog.init();
    await eventLog.reset();

    expect(clearCalls).toBe(1);
    expect(eventLog.getAll()).toEqual([]);
    expect(eventLog.hasExistingSession()).toBe(false);
  });
});
