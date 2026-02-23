import { describe, expect, test } from 'vitest';

import { createMap } from '../map.js';
import { renderTerrainLayer } from './terrain-layer.js';

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

describe('terrain layer', () => {
  test('renders one tile element per terrain tile', () => {
    const container = createFakeElement('div');
    const map = createMap({
      width: 3,
      height: 2,
      tiles: [
        0, 1, 0,
        1, 0, 0
      ]
    });

    renderTerrainLayer({
      container,
      map,
      createElement: createFakeElement
    });

    expect(container.children).toHaveLength(6);
  });

  test('marks each rendered tile with passable or blocked class', () => {
    const container = createFakeElement('div');
    const map = createMap({
      width: 2,
      height: 2,
      tiles: [
        0, 1,
        1, 0
      ]
    });

    renderTerrainLayer({
      container,
      map,
      createElement: createFakeElement
    });

    const classes = container.children.map((tileEl) => tileEl.className);
    expect(classes).toContain('terrain-tile terrain-tile--passable');
    expect(classes).toContain('terrain-tile terrain-tile--blocked');
  });
});
