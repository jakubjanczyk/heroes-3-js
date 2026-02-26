import { describe, expect, test } from 'vitest';

import { createWorldContext } from './world-context.js';

describe('world context', () => {
  test('creates map, occupancy and debug bus from loaded game data', async () => {
    const logs = [];
    const context = await createWorldContext({
      fetch: async () => {
        throw new Error('not used');
      },
      loadGame: async () => ({
        scenario: {
          meta: { id: 'demo' },
          terrain: { width: 2, height: 1, tiles: [0, 0] },
          entities: [{ id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } }]
        },
        definitions: { hero: { name: 'Hero' } }
      }),
      createBus: ({ debug, log }) => {
        logs.push({ debug, hasLogger: typeof log === 'function' });
        return { id: 'bus' };
      },
      busDebug: true,
      busLogger: () => {}
    });

    expect(context.scenario.meta.id).toBe('demo');
    expect(context.map.width).toBe(2);
    expect(context.occupancy.getAt({ x: 0, y: 0 })?.id).toBe('hero-1');
    expect(context.bus).toEqual({ id: 'bus' });
    expect(logs).toEqual([{ debug: true, hasLogger: true }]);
  });

  test('uses provided bus without creating a new one', async () => {
    const providedBus = { id: 'provided' };
    const context = await createWorldContext({
      fetch: async () => {
        throw new Error('not used');
      },
      loadGame: async () => ({
        scenario: {
          meta: { id: 'demo' },
          terrain: { width: 1, height: 1, tiles: [0] },
          entities: []
        },
        definitions: {}
      }),
      bus: providedBus,
      createBus: () => {
        throw new Error('should not be called');
      }
    });

    expect(context.bus).toBe(providedBus);
  });
});
