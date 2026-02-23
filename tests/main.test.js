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
    const fakeCamera = {
      setFollowTileGetter() {},
      update() {}
    };

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

  test('bootApp renders hero and initializes camera follow on hero tile', async () => {
    const terrainLayer = createFakeElement('div');
    const entityLayer = createFakeElement('div');
    const viewport = createFakeElement('div');
    const worldEl = createFakeElement('div');
    const fakeDocument = {
      querySelector(selector) {
        if (selector === '.terrain-layer') {
          return terrainLayer;
        }
        if (selector === '.entity-layer') {
          return entityLayer;
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

    const fakeCamera = {
      setFollowTileGetterCalls: [],
      updateCalls: 0,
      setFollowTileGetter(getter) {
        this.setFollowTileGetterCalls.push(getter);
      },
      update() {
        this.updateCalls += 1;
      }
    };

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
          entities: [
            { id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 1, y: 1 } }
          ]
        },
        definitions: {}
      }),
      createCamera: () => fakeCamera,
      attachCameraInput: () => {}
    });

    expect(entityLayer.children).toHaveLength(1);
    expect(entityLayer.children[0].dataset.entityId).toBe('hero-1');
    expect(fakeCamera.setFollowTileGetterCalls).toHaveLength(1);
    expect(fakeCamera.setFollowTileGetterCalls[0]()).toEqual({ x: 1, y: 1 });
    expect(fakeCamera.updateCalls).toBe(1);
  });
});
