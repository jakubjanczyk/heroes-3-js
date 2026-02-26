import { describe, expect, test } from 'vitest';

import { createDomContext } from './dom-context.js';

describe('dom context', () => {
  test('collects required DOM nodes and element factory', () => {
    const nodes = {
      '.terrain-layer': { id: 'terrain' },
      '.entity-layer': { id: 'entity' },
      '.effects-layer': { id: 'effects' },
      '.ui-layer': { id: 'ui' },
      '.viewport': { id: 'viewport' },
      '.world': { id: 'world' }
    };
    const ids = {
      'movement-points-status': { id: 'mp' },
      'end-turn-button': { id: 'end' },
      'music-toggle-button': { id: 'music' }
    };
    const document = {
      querySelector(selector) {
        return nodes[selector] ?? null;
      },
      getElementById(id) {
        return ids[id] ?? null;
      },
      createElement(tag) {
        return { tag };
      }
    };

    const context = createDomContext(document);

    expect(context.terrainLayer).toEqual({ id: 'terrain' });
    expect(context.worldElement).toEqual({ id: 'world' });
    expect(context.movementPointsStatus).toEqual({ id: 'mp' });
    expect(context.createElement('div')).toEqual({ tag: 'div' });
  });
});
