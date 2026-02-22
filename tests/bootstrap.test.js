import { describe, expect, test } from 'vitest';

import { loadGame } from '../game/load.js';

function createFakeFetch(urlToJson) {
  return async (url) => {
    if (!(url in urlToJson)) {
      return {
        ok: false,
        status: 404,
        json: async () => {
          throw new Error('not found');
        }
      };
    }

    return {
      ok: true,
      status: 200,
      json: async () => urlToJson[url]
    };
  };
}

describe('bootstrap', () => {
  test('loadGame loads scenario and definitions', async () => {
    const scenario = {
      meta: { id: 'demo', name: 'Demo', width: 3, height: 2 },
      terrain: { width: 3, height: 2, tiles: [0, 1, 0, 0, 0, 1] },
      entities: [
        { id: 'hero', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } },
        { id: 'm1', kind: 'MONSTER', type: 'SKELETON', tile: { x: 2, y: 0 } },
        { id: 'r1', kind: 'RESOURCE', type: 'GOLD_PILE', tile: { x: 0, y: 1 } },
        { id: 't1', kind: 'TOWN', type: 'CASTLE', tile: { x: 1, y: 1 } }
      ]
    };

    const definitions = {
      hero: { id: 'HERO', name: 'Hero' },
      monsters: { SKELETON: { name: 'Skeleton' } },
      resources: { GOLD_PILE: { name: 'Gold Pile', amount: 100 } },
      towns: { CASTLE: { name: 'Castle' } }
    };

    const fetch = createFakeFetch({
      '/scenarios/scenario.json': scenario,
      '/game/data/hero.json': definitions.hero,
      '/game/data/monsters.json': definitions.monsters,
      '/game/data/resources.json': definitions.resources,
      '/game/data/towns.json': definitions.towns
    });

    const loaded = await loadGame({ fetch });

    expect(loaded.scenario.meta.id).toBe('demo');
    expect(loaded.scenario.entities).toHaveLength(4);
    expect(loaded.definitions).toEqual(definitions);
  });
});
