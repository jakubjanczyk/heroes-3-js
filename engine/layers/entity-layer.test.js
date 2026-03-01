import { describe, expect, test } from 'vitest';

import { createMap } from '../map.js';
import { renderEntityLayer } from './entity-layer.js';

function createFakeElement(tagName) {
  return {
    tagName,
    className: '',
    style: {},
    dataset: {},
    children: [],
    appendChild(child) {
      this.children.push(child);
    }
  };
}

describe('entity layer', () => {
  test('renders hero, monster, resource, and town entities into the entity layer', () => {
    const container = createFakeElement('div');
    const map = createMap({
      width: 4,
      height: 4,
      tiles: new Array(16).fill(0)
    });

    renderEntityLayer({
      container,
      map,
      entities: [
        { id: 'hero-1', kind: 'HERO', tile: { x: 1, y: 1 } },
        { id: 'monster-1', kind: 'MONSTER', tile: { x: 2, y: 2 } },
        { id: 'resource-1', kind: 'RESOURCE', type: 'GOLD_PILE', tile: { x: 3, y: 1 } },
        { id: 'town-1', kind: 'TOWN', type: 'CASTLE', tile: { x: 0, y: 2 } }
      ],
      createElement: createFakeElement
    });

    expect(container.children).toHaveLength(4);
    expect(container.children[0].className).toBe('entity entity--hero');
    expect(container.children[0].dataset.entityId).toBe('hero-1');
    expect(container.children[0].dataset.tileX).toBe('1');
    expect(container.children[0].dataset.tileY).toBe('1');
    expect(container.children[1].className).toBe('entity entity--monster');
    expect(container.children[1].dataset.entityId).toBe('monster-1');
    expect(container.children[1].dataset.tileX).toBe('2');
    expect(container.children[1].dataset.tileY).toBe('2');
    expect(container.children[2].className).toBe(
      'entity entity--resource entity--resource-type-gold-pile'
    );
    expect(container.children[2].dataset.entityId).toBe('resource-1');
    expect(container.children[2].dataset.resourceType).toBe('GOLD_PILE');
    expect(container.children[2].dataset.tileX).toBe('3');
    expect(container.children[2].dataset.tileY).toBe('1');

    expect(container.children[3].className).toBe('entity entity--town');
    expect(container.children[3].dataset.entityId).toBe('town-1');
    expect(container.children[3].dataset.townType).toBe('CASTLE');
    expect(container.children[3].dataset.tileX).toBe('0');
    expect(container.children[3].dataset.tileY).toBe('2');
  });

  test('positions hero using the same centered map origin as terrain', () => {
    const container = createFakeElement('div');
    container.clientWidth = 1000;
    container.clientHeight = 700;
    const map = createMap({
      width: 4,
      height: 4,
      tiles: new Array(16).fill(0)
    });
    const heroTile = { x: 1, y: 2 };
    const screen = map.tileToScreen(heroTile);
    const mapPixelWidth = map.width * map.tileWidth;
    const mapPixelHeight = map.height * map.tileHeight;
    const originX = Math.round((1000 - mapPixelWidth) / 2);
    const originY = Math.round((700 - mapPixelHeight) / 2);

    renderEntityLayer({
      container,
      map,
      entities: [{ id: 'hero-1', kind: 'HERO', tile: heroTile }],
      createElement: createFakeElement
    });

    expect(container.children[0].style.transform).toBe(
      `translate(${originX + screen.x + map.halfTileWidth - 12}px, ${originY + screen.y + map.halfTileHeight - 12}px)`
    );
  });

  test('maps each homm3 resource type to a specific class', () => {
    const container = createFakeElement('div');
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

    renderEntityLayer({
      container,
      map,
      entities: resources.map(([id, type], index) => ({
        id,
        kind: 'RESOURCE',
        type,
        tile: { x: index, y: 0 }
      })),
      createElement: createFakeElement
    });

    expect(container.children).toHaveLength(7);

    resources.forEach(([, type], index) => {
      const expectedClass = `entity--resource-type-${type.toLowerCase().replaceAll('_', '-')}`;
      expect(container.children[index].className).toContain(expectedClass);
      expect(container.children[index].dataset.resourceType).toBe(type);
    });
  });
});
