import { describe, expect, test } from 'vitest';

import { bootApp } from './main.js';

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

function createFakeDocument({
  includeBootStatus = false,
  includeCameraShell = true
} = {}) {
  const terrainLayer = createFakeElement('div');
  const entityLayer = createFakeElement('div');
  const effectsLayer = createFakeElement('div');
  const viewport = createFakeElement('div');
  const worldEl = createFakeElement('div');
  const bootStatus = includeBootStatus ? createFakeElement('div') : null;
  const selectorMap = {
    '.terrain-layer': terrainLayer,
    '.entity-layer': entityLayer,
    '.effects-layer': effectsLayer
  };
  if (includeCameraShell) {
    selectorMap['.viewport'] = viewport;
    selectorMap['.world'] = worldEl;
  }

  return {
    terrainLayer,
    entityLayer,
    effectsLayer,
    viewport,
    worldEl,
    bootStatus,
    fakeDocument: {
      querySelector(selector) {
        return selectorMap[selector] ?? null;
      },
      getElementById(id) {
        if (id === 'boot-status') {
          return bootStatus;
        }
        return null;
      },
      createElement: createFakeElement
    }
  };
}

function createLoadGame({
  width = 2,
  height = 2,
  tiles = [0, 1, 1, 0],
  entities = []
} = {}) {
  return async () => ({
    scenario: {
      meta: { id: 'demo' },
      terrain: { width, height, tiles },
      entities
    },
    definitions: {}
  });
}

async function fetchShouldNotBeCalled() {
  throw new Error('fetch should not be called in this test');
}

describe('main boot', () => {
  test('bootApp renders scenario terrain into the terrain layer', async () => {
    const { terrainLayer, bootStatus, fakeDocument } = createFakeDocument({
      includeBootStatus: true,
      includeCameraShell: false
    });

    await bootApp({
      fetch: fetchShouldNotBeCalled,
      document: fakeDocument,
      loadGame: createLoadGame()
    });

    expect(terrainLayer.children).toHaveLength(4);
    expect(bootStatus.textContent).toBe('Boot ok: demo');
  });

  test('bootApp wires camera and input with viewport and world elements', async () => {
    const { viewport, worldEl, fakeDocument } = createFakeDocument();

    const createdCameras = [];
    const attachedInputs = [];
    const fakeCamera = {
      setFollowTileGetter() {},
      update() {}
    };

    await bootApp({
      fetch: fetchShouldNotBeCalled,
      document: fakeDocument,
      window: {},
      loadGame: createLoadGame(),
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
    const { entityLayer, fakeDocument } = createFakeDocument();

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
      fetch: fetchShouldNotBeCalled,
      document: fakeDocument,
      window: {},
      loadGame: createLoadGame({
        entities: [{ id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 1, y: 1 } }]
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

  test('first click previews path and second click confirms movement', async () => {
    const { fakeDocument } = createFakeDocument();

    const moveCalls = [];
    let attachedInputArgs = null;
    const previewCalls = [];

    await bootApp({
      fetch: fetchShouldNotBeCalled,
      document: fakeDocument,
      window: {},
      loadGame: createLoadGame({
        tiles: [0, 0, 0, 0],
        entities: [{ id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } }]
      }),
      createCamera: () => ({
        setFollowTileGetter() {},
        update() {}
      }),
      createMovementSystem: () => ({
        moveHeroTo(tile) {
          moveCalls.push(tile);
        }
      }),
      renderPathPreviewLayer: (args) => {
        previewCalls.push(args);
      },
      attachCameraInput: (args) => {
        attachedInputArgs = args;
      }
    });

    attachedInputArgs.onTileClick({ x: 1, y: 1 });
    expect(moveCalls).toEqual([]);
    expect(previewCalls.at(-1)?.path?.length).toBeGreaterThan(1);

    attachedInputArgs.onTileClick({ x: 1, y: 1 });
    expect(moveCalls).toEqual([{ x: 1, y: 1 }]);
  });

  test('preview path shrinks as movement steps are reached', async () => {
    const { fakeDocument } = createFakeDocument();

    const previewPathLengths = [];
    let attachedInputArgs = null;

    await bootApp({
      fetch: fetchShouldNotBeCalled,
      document: fakeDocument,
      window: {},
      loadGame: createLoadGame({
        width: 3,
        height: 1,
        tiles: [0, 0, 0],
        entities: [{ id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } }]
      }),
      createCamera: () => ({
        setFollowTileGetter() {},
        update() {}
      }),
      createMovementSystem: ({ onStep }) => ({
        async moveHeroTo() {
          onStep({ to: { x: 1, y: 0 } });
          onStep({ to: { x: 2, y: 0 } });
          return true;
        }
      }),
      renderPathPreviewLayer: ({ path }) => {
        previewPathLengths.push(path ? path.length : 0);
      },
      attachCameraInput: (args) => {
        attachedInputArgs = args;
      }
    });

    attachedInputArgs.onTileClick({ x: 2, y: 0 });
    attachedInputArgs.onTileClick({ x: 2, y: 0 });

    expect(previewPathLengths).toContain(3);
    expect(previewPathLengths).toContain(2);
    expect(previewPathLengths).toContain(1);
  });

  test('clicking different tile before confirm retargets preview', async () => {
    const { fakeDocument } = createFakeDocument();

    const moveCalls = [];
    const previewTargets = [];
    let attachedInputArgs = null;

    await bootApp({
      fetch: fetchShouldNotBeCalled,
      document: fakeDocument,
      window: {},
      loadGame: createLoadGame({
        width: 3,
        height: 2,
        tiles: [0, 0, 0, 0, 0, 0],
        entities: [{ id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } }]
      }),
      createCamera: () => ({
        setFollowTileGetter() {},
        update() {}
      }),
      createMovementSystem: () => ({
        moveHeroTo(tile) {
          moveCalls.push(tile);
          return true;
        }
      }),
      renderPathPreviewLayer: ({ targetTile }) => {
        if (targetTile) {
          previewTargets.push(targetTile);
        }
      },
      attachCameraInput: (args) => {
        attachedInputArgs = args;
      }
    });

    attachedInputArgs.onTileClick({ x: 2, y: 1 });
    attachedInputArgs.onTileClick({ x: 1, y: 0 });
    expect(moveCalls).toEqual([]);

    attachedInputArgs.onTileClick({ x: 1, y: 0 });
    expect(moveCalls).toEqual([{ x: 1, y: 0 }]);
    expect(previewTargets).toContainEqual({ x: 2, y: 1 });
    expect(previewTargets).toContainEqual({ x: 1, y: 0 });
  });

  test('movement locks camera follow and recenters on hero until movement ends', async () => {
    const { fakeDocument } = createFakeDocument();

    let attachedInputArgs = null;
    const cameraCalls = {
      lockFollow: 0,
      unlockFollow: 0,
      centerOnTile: []
    };
    const fakeCamera = {
      setFollowTileGetter() {},
      update() {},
      lockFollow() {
        cameraCalls.lockFollow += 1;
      },
      unlockFollow() {
        cameraCalls.unlockFollow += 1;
      },
      centerOnTile(tile) {
        cameraCalls.centerOnTile.push(tile);
      }
    };

    await bootApp({
      fetch: fetchShouldNotBeCalled,
      document: fakeDocument,
      window: {},
      loadGame: createLoadGame({
        width: 3,
        height: 2,
        tiles: [0, 0, 0, 0, 0, 0],
        entities: [{ id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } }]
      }),
      createCamera: () => fakeCamera,
      createMovementSystem: ({ onStep }) => ({
        async moveHeroTo() {
          onStep({ to: { x: 1, y: 0 } });
          onStep({ to: { x: 2, y: 1 } });
          return true;
        }
      }),
      attachCameraInput: (args) => {
        attachedInputArgs = args;
      }
    });

    attachedInputArgs.onTileClick({ x: 2, y: 1 });
    attachedInputArgs.onTileClick({ x: 2, y: 1 });
    await Promise.resolve();

    expect(cameraCalls.lockFollow).toBe(1);
    expect(cameraCalls.unlockFollow).toBe(1);
    expect(cameraCalls.centerOnTile).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 1 }
    ]);
  });
});
