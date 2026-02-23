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

  test('bootApp wires camera and input with viewport and world elements', async () => {
    const terrainLayer = createFakeElement('div');
    const viewport = createFakeElement('div');
    const worldEl = createFakeElement('div');
    const fakeDocument = {
      querySelector(selector) {
        if (selector === '.terrain-layer') {
          return terrainLayer;
        }
        if (selector === '.viewport') {
          return viewport;
        }
        if (selector === '.world') {
          return worldEl;
        }
        return null;
      },
      getElementById() {
        return null;
      },
      createElement: createFakeElement
    };

    const createdCameras = [];
    const attachedInputs = [];
    const fakeCamera = {};

    await bootApp({
      fetch: async () => {
        throw new Error('fetch should not be called in this test');
      },
      document: fakeDocument,
      window: {},
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
      }),
      createCamera: (args) => {
        createdCameras.push(args);
        return fakeCamera;
      },
      attachCameraInput: (args) => {
        attachedInputs.push(args);
      }
    });

    expect(createdCameras).toHaveLength(1);
    expect(createdCameras[0]).toMatchObject({
      viewport,
      world: worldEl
    });
    expect(attachedInputs).toHaveLength(1);
    expect(attachedInputs[0]).toMatchObject({
      camera: fakeCamera,
      viewport
    });
  });
});
