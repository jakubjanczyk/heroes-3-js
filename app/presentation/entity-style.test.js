import { describe, expect, test } from 'vitest';

import { createMap } from '../../engine/map.js';
import { getDefaultEntityLayerStyle } from './entity-style.js';

describe('entity layer style resolver', () => {
  test('maps each homm3 resource type to a specific class and dataset', () => {
    const map = createMap({
      width: 7,
      height: 1,
      tiles: new Array(7).fill(0)
    });

    const resources = [
      ['resource-gold', 'GOLD_PILE'],
      ['resource-wood', 'WOOD_PILE'],
      ['resource-ore', 'ORE_PILE'],
      ['resource-mercury', 'MERCURY_PILE'],
      ['resource-sulfur', 'SULFUR_PILE'],
      ['resource-crystal', 'CRYSTAL_PILE'],
      ['resource-gems', 'GEMS_PILE']
    ];

    resources.forEach(([, type]) => {
      const style = getDefaultEntityLayerStyle({
        entity: { id: 'x', kind: 'RESOURCE', type, tile: { x: 0, y: 0 } },
        map
      });
      const expectedClass = `entity--resource-type-${type.toLowerCase().replaceAll('_', '-')}`;
      expect(style?.className).toContain(expectedClass);
      expect(style?.dataset?.resourceType).toBe(type);
    });
  });

  test('adds town type dataset when provided', () => {
    const map = createMap({
      width: 4,
      height: 4,
      tiles: new Array(16).fill(0)
    });
    const style = getDefaultEntityLayerStyle({
      entity: { id: 'town-1', kind: 'TOWN', type: 'CASTLE', tile: { x: 0, y: 0 } },
      map
    });

    expect(style?.className).toBe('entity entity--town');
    expect(style?.dataset?.townType).toBe('CASTLE');
  });

  test('maps each mine type to a specific class and dataset', () => {
    const map = createMap({
      width: 7,
      height: 1,
      tiles: new Array(7).fill(0)
    });

    const mineTypes = [
      'GOLD_MINE',
      'SAWMILL',
      'ORE_PIT',
      'ALCHEMIST_LAB',
      'SULFUR_DUNE',
      'CRYSTAL_CAVERN',
      'GEM_POND'
    ];

    mineTypes.forEach((type) => {
      const style = getDefaultEntityLayerStyle({
        entity: { id: 'mine-1', kind: 'MINE', type, tile: { x: 0, y: 0 } },
        map
      });
      const expectedClass = `entity--mine-type-${type.toLowerCase().replaceAll('_', '-')}`;
      expect(style?.className).toContain(expectedClass);
      expect(style?.dataset?.mineType).toBe(type);
      expect(style?.width).toBe(96);
      expect(style?.height).toBe(64);
    });
  });
});
