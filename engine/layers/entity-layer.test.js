import { describe, expect, test } from 'vitest';

import { createMap } from '../map.js';
import { renderEntityLayer } from './entity-layer.js';

function createFakeElement(tagName) {
  return {
    tagName,
    className: '',
    style: {
      setProperty(name, value) {
        this[name] = value;
      },
      getPropertyValue(name) {
        return this[name] ?? '';
      },
      removeProperty(name) {
        delete this[name];
      }
    },
    dataset: {},
    children: [],
    appendChild(child) {
      this.children.push(child);
    }
  };
}

describe('entity layer', () => {
  test('renders entities into the entity layer using provided style resolver', () => {
    const container = createFakeElement('div');
    const map = createMap({
      width: 4,
      height: 4,
      tiles: new Array(16).fill(0)
    });

    function getEntityStyle({ entity }) {
      if (entity.kind === 'UNKNOWN') {
        return null;
      }

      return {
        className: `entity entity--${String(entity.kind).toLowerCase()}`,
        width: 10,
        height: 20,
        offsetX: -5,
        offsetY: -10,
        backgroundImage: entity.kind === 'RESOURCE' ? '/sprite.png' : null,
        dataset: entity.type ? { entityType: String(entity.type) } : {}
      };
    }

    renderEntityLayer({
      container,
      map,
      entities: [
        { id: 'hero-1', kind: 'HERO', tile: { x: 1, y: 1 } },
        { id: 'monster-1', kind: 'MONSTER', tile: { x: 2, y: 2 } },
        { id: 'resource-1', kind: 'RESOURCE', type: 'GOLD_PILE', tile: { x: 3, y: 1 } },
        { id: 'town-1', kind: 'TOWN', type: 'CASTLE', tile: { x: 0, y: 2 } },
        { id: 'unknown-1', kind: 'UNKNOWN', tile: { x: 0, y: 0 } }
      ],
      createElement: createFakeElement,
      getEntityStyle
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
    expect(container.children[2].className).toBe('entity entity--resource');
    expect(container.children[2].dataset.entityId).toBe('resource-1');
    expect(container.children[2].dataset.entityType).toBe('GOLD_PILE');
    expect(container.children[2].dataset.tileX).toBe('3');
    expect(container.children[2].dataset.tileY).toBe('1');
    expect(container.children[2].style.getPropertyValue('--entity-background-image')).toBe("url('/sprite.png')");

    expect(container.children[3].className).toBe('entity entity--town');
    expect(container.children[3].dataset.entityId).toBe('town-1');
    expect(container.children[3].dataset.entityType).toBe('CASTLE');
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

    function getEntityStyle() {
      return {
        className: 'entity entity--hero',
        width: 24,
        height: 24,
        offsetX: -12,
        offsetY: -12
      };
    }

    renderEntityLayer({
      container,
      map,
      entities: [{ id: 'hero-1', kind: 'HERO', tile: heroTile }],
      createElement: createFakeElement,
      getEntityStyle
    });

    expect(container.children[0].style.transform).toBe(
      `translate(${screen.x + map.halfTileWidth - 12}px, ${screen.y + map.halfTileHeight - 12}px)`
    );
    expect(container.children[0].style.getPropertyValue('--entity-offset-x')).toBe('-12px');
    expect(container.children[0].style.getPropertyValue('--entity-offset-y')).toBe('-12px');
  });
});
