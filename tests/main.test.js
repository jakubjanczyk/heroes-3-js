import { describe, expect, test } from 'vitest';

import { bootApp } from '../main.js';

function createFakeElement(tagName) {
  return {
    tagName,
    textContent: '',
    className: '',
    style: {},
    dataset: {},
    children: [],
    appendChild(child) {
      this.children.push(child);
    },
    replaceChildren() {
      this.children = [];
    }
  };
}

describe('main boot', () => {
  test('bootApp renders scenario terrain into the terrain layer', async () => {
    const terrainLayer = createFakeElement('div');
    const bootStatus = createFakeElement('div');
    const fakeDocument = {
      querySelector(selector) {
        if (selector === '.terrain-layer') {
          return terrainLayer;
        }
        return null;
      },
      getElementById(id) {
        if (id === 'boot-status') {
          return bootStatus;
        }
        return null;
      },
      createElement: createFakeElement
    };

    await bootApp({
      fetch: async () => {
        throw new Error('fetch should not be called in this test');
      },
      document: fakeDocument,
      loadGame: async () => ({
        scenario: {
          meta: { id: 'demo' },
          terrain: {
            width: 2,
            height: 2,
            tiles: [0, 1, 1, 0]
          },
          entities: []
        },
        definitions: {}
      })
    });

    expect(terrainLayer.children).toHaveLength(4);
    expect(bootStatus.textContent).toBe('Boot ok: demo');
  });
});
