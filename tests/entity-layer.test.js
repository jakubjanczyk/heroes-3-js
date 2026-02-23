import { describe, expect, test } from 'vitest';

import { createMap } from '../engine/map.js';
import { renderEntityLayer } from '../engine/layers/entity-layer.js';

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
  test('renders only hero entities into the entity layer', () => {
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
        { id: 'monster-1', kind: 'MONSTER', tile: { x: 2, y: 2 } }
      ],
      createElement: createFakeElement
    });

    expect(container.children).toHaveLength(1);
    expect(container.children[0].className).toBe('entity entity--hero');
    expect(container.children[0].dataset.entityId).toBe('hero-1');
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
    const mapPixelWidth = (map.width + map.height) * map.halfTileWidth;
    const mapPixelHeight = (map.width + map.height) * map.halfTileHeight;
    const minXOffset = (map.height - 1) * map.halfTileWidth;
    const originX = Math.round((1000 - mapPixelWidth) / 2 + minXOffset);
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
});
