import { describe, expect, test } from 'vitest';

import { bootApp } from './app/boot-app.js';
import {
  APP_COMMAND_CAMERA_PAN_BY,
  APP_COMMAND_END_TURN_REQUESTED,
  APP_COMMAND_MOVE_REQUESTED,
  APP_COMMAND_MUSIC_TOGGLE_REQUESTED,
  APP_COMMAND_TILE_CLICKED,
  APP_FACT_MOVE_FINISHED,
  APP_FACT_MOVE_STARTED
} from './app/events.js';
import { createMovementSystem as createMovementSystemDefault } from './game/systems/movement-system.js';
import { createFakeBus } from './tests/test-utils/fake-bus.js';

function createFakeElement(tagName) {
  const listeners = {};
  const attributes = {};
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
    },
    addEventListener(type, handler) {
      if (!listeners[type]) {
        listeners[type] = [];
      }
      listeners[type].push(handler);
    },
    removeEventListener(type, handler) {
      listeners[type] = (listeners[type] ?? []).filter((item) => item !== handler);
    },
    setAttribute(name, value) {
      attributes[name] = String(value);
    },
    getAttribute(name) {
      return attributes[name] ?? null;
    },
    trigger(type, event = {}) {
      for (const handler of listeners[type] ?? []) {
        handler(event);
      }
    },
    click() {
      this.trigger('click', {
        currentTarget: this,
        stopPropagation() {}
      });
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
  const movementPointsStatus = createFakeElement('div');
  const endTurnButton = createFakeElement('button');
  const musicToggleButton = createFakeElement('button');
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
    movementPointsStatus,
    endTurnButton,
    musicToggleButton,
    fakeDocument: {
      querySelector(selector) {
        return selectorMap[selector] ?? null;
      },
      getElementById(id) {
        if (id === 'boot-status') {
          return bootStatus;
        }
        if (id === 'movement-points-status') {
          return movementPointsStatus;
        }
        if (id === 'end-turn-button') {
          return endTurnButton;
        }
        if (id === 'music-toggle-button') {
          return musicToggleButton;
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

async function flushMicrotasks(times = 30) {
  for (let i = 0; i < times; i += 1) {
    await Promise.resolve();
  }
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
    const moveByCalls = [];
    const fakeCamera = {
      moveBy(dx, dy) {
        moveByCalls.push([dx, dy]);
      },
      getOffset() {
        return { x: 0, y: 0 };
      },
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
      viewport
    });
    expect(attachedInputs[0].camera).not.toBe(fakeCamera);
    attachedInputs[0].camera.moveBy(6, -4);
    expect(moveByCalls).toEqual([[6, -4]]);
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
      createMovementSystem: ({ onMoveStart, onMoveFinish, onStep }) => ({
        async moveHeroTo(targetTile) {
          onMoveStart({ targetTile });
          onStep({ to: { x: 1, y: 0 } });
          onStep({ to: { x: 2, y: 1 } });
          onMoveFinish({ targetTile });
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

  test('over-limit move travels to movement limit and keeps planned remainder', async () => {
    const {
      fakeDocument,
      movementPointsStatus,
      endTurnButton
    } = createFakeDocument();

    let attachedInputArgs = null;
    const previewCalls = [];
    const fakeCamera = {
      setFollowTileGetter() {},
      update() {},
      clearPan() {},
      lockFollow() {},
      unlockFollow() {},
      centerOnTile() {}
    };

    const world = await bootApp({
      fetch: fetchShouldNotBeCalled,
      document: fakeDocument,
      window: {},
      loadGame: createLoadGame({
        width: 20,
        height: 1,
        tiles: new Array(20).fill(0),
        entities: [{ id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } }]
      }),
      createCamera: () => fakeCamera,
      createMovementSystem: (args) => createMovementSystemDefault({
        ...args,
        sleep: async () => {},
        stepDelayMs: 0
      }),
      renderPathPreviewLayer: (args) => {
        previewCalls.push(args);
      },
      attachCameraInput: (args) => {
        attachedInputArgs = args;
      }
    });

    expect(movementPointsStatus.textContent).toBe('MP: 15 / 15');

    attachedInputArgs.onTileClick({ x: 16, y: 0 });
    attachedInputArgs.onTileClick({ x: 16, y: 0 });
    await flushMicrotasks();

    const hero = world.scenario.entities.find((entity) => entity.kind === 'HERO');
    expect(hero.tile).toEqual({ x: 15, y: 0 });
    expect(movementPointsStatus.textContent).toBe('MP: 0 / 15');
    expect(previewCalls.at(-1)?.targetTile).toEqual({ x: 16, y: 0 });
    expect(previewCalls.at(-1)?.path?.[0]).toEqual({ x: 15, y: 0 });

    attachedInputArgs.onTileClick({ x: 16, y: 0 });
    await flushMicrotasks();

    expect(hero.tile).toEqual({ x: 15, y: 0 });
    expect(movementPointsStatus.textContent).toBe('MP: 0 / 15');
    expect(previewCalls.at(-1)?.targetTile).toEqual({ x: 16, y: 0 });
    expect(previewCalls.at(-1)?.path?.[0]).toEqual({ x: 15, y: 0 });

    endTurnButton.click();

    expect(movementPointsStatus.textContent).toBe('MP: 15 / 15');
    expect(previewCalls.at(-1)?.targetTile).toEqual({ x: 16, y: 0 });
    expect(previewCalls.at(-1)?.path?.[0]).toEqual({ x: 15, y: 0 });
    expect(previewCalls.at(-1)?.maxAffordableSteps).toBe(15);

    attachedInputArgs.onTileClick({ x: 14, y: 0 });
    attachedInputArgs.onTileClick({ x: 14, y: 0 });
    await flushMicrotasks();

    expect(hero.tile).toEqual({ x: 14, y: 0 });
    expect(movementPointsStatus.textContent).toBe('MP: 14 / 15');
  });

  test('end turn input is ignored while hero is moving', async () => {
    const {
      fakeDocument,
      movementPointsStatus,
      endTurnButton
    } = createFakeDocument();

    let attachedInputArgs = null;
    let resolveSleep = null;
    const fakeCamera = {
      setFollowTileGetter() {},
      update() {},
      clearPan() {},
      lockFollow() {},
      unlockFollow() {},
      centerOnTile() {}
    };

    await bootApp({
      fetch: fetchShouldNotBeCalled,
      document: fakeDocument,
      window: {},
      loadGame: createLoadGame({
        width: 2,
        height: 1,
        tiles: [0, 0],
        entities: [{ id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } }]
      }),
      createCamera: () => fakeCamera,
      createMovementSystem: (args) => createMovementSystemDefault({
        ...args,
        sleep: () => new Promise((resolve) => {
          resolveSleep = resolve;
        }),
        stepDelayMs: 1
      }),
      attachCameraInput: (args) => {
        attachedInputArgs = args;
      }
    });

    attachedInputArgs.onTileClick({ x: 1, y: 0 });
    attachedInputArgs.onTileClick({ x: 1, y: 0 });
    await flushMicrotasks(3);

    expect(movementPointsStatus.textContent).toBe('MP: 14 / 15');

    endTurnButton.click();
    expect(movementPointsStatus.textContent).toBe('MP: 14 / 15');

    resolveSleep();
    await flushMicrotasks(3);

    endTurnButton.click();
    expect(movementPointsStatus.textContent).toBe('MP: 15 / 15');
  });

  test('music toggle updates behavior state in UI', async () => {
    const { fakeDocument, musicToggleButton } = createFakeDocument({ includeCameraShell: false });

    const calls = {
      start: 0,
      toggle: 0
    };
    let enabled = true;

    await bootApp({
      fetch: fetchShouldNotBeCalled,
      document: fakeDocument,
      loadGame: createLoadGame(),
      createMusicPlayer: ({ tracks }) => {
        expect(tracks).toEqual(['/assets/music/a.mp3', '/assets/music/b.mp3']);
        return {
          start() {
            calls.start += 1;
          },
          toggle() {
            calls.toggle += 1;
            enabled = !enabled;
            return enabled;
          },
          isEnabled() {
            return enabled;
          }
        };
      },
      musicTracks: ['/assets/music/a.mp3', '/assets/music/b.mp3']
    });

    expect(calls.start).toBe(1);
    expect(musicToggleButton.textContent).toBe('Music: On');
    expect(musicToggleButton.getAttribute('aria-pressed')).toBe('true');

    musicToggleButton.click();
    await flushMicrotasks(2);

    expect(calls.toggle).toBe(1);
    expect(musicToggleButton.textContent).toBe('Music: Off');
    expect(musicToggleButton.getAttribute('aria-pressed')).toBe('false');

    musicToggleButton.click();
    await flushMicrotasks(2);

    expect(calls.toggle).toBe(2);
    expect(musicToggleButton.textContent).toBe('Music: On');
    expect(musicToggleButton.getAttribute('aria-pressed')).toBe('true');
  });

  test('bootApp loads music tracks through loader when not provided directly', async () => {
    const { fakeDocument } = createFakeDocument({ includeCameraShell: false });

    const calls = {
      loadMusicTracks: 0,
      tracksSeen: null
    };

    await bootApp({
      fetch: fetchShouldNotBeCalled,
      document: fakeDocument,
      loadGame: createLoadGame(),
      loadMusicTracks: async ({ manifestUrl }) => {
        calls.loadMusicTracks += 1;
        expect(manifestUrl).toBe('/assets/music/tracks.json');
        return ['/assets/music/a.mp3'];
      },
      createMusicPlayer: ({ tracks }) => {
        calls.tracksSeen = tracks;
        return {
          start() {},
          toggle() {},
          isEnabled() {
            return true;
          }
        };
      }
    });

    expect(calls.loadMusicTracks).toBe(1);
    expect(calls.tracksSeen).toEqual(['/assets/music/a.mp3']);
  });

  test('bootApp publishes click and button intents to bus commands', async () => {
    const { fakeDocument, endTurnButton, musicToggleButton } = createFakeDocument();

    let attachedInputArgs = null;
    const fakeBus = createFakeBus();

    await bootApp({
      fetch: fetchShouldNotBeCalled,
      document: fakeDocument,
      window: {},
      bus: fakeBus,
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
      attachCameraInput: (args) => {
        attachedInputArgs = args;
      },
      createMovementSystem: () => ({
        moveHeroTo() {
          return true;
        }
      }),
      createMusicPlayer: () => ({
        start() {},
        toggle() {
          return true;
        },
        isEnabled() {
          return false;
        }
      })
    });

    attachedInputArgs.onTileClick({ x: 1, y: 0 });
    endTurnButton.click();
    musicToggleButton.click();

    expect(fakeBus.emitted).toContainEqual({
      type: APP_COMMAND_TILE_CLICKED,
      detail: { tile: { x: 1, y: 0 } }
    });
    expect(fakeBus.emitted).toContainEqual({
      type: APP_COMMAND_END_TURN_REQUESTED,
      detail: {}
    });
    expect(fakeBus.emitted).toContainEqual({
      type: APP_COMMAND_MUSIC_TOGGLE_REQUESTED,
      detail: {}
    });
  });

  test('camera pan from input is routed through bus command', async () => {
    const { fakeDocument } = createFakeDocument();

    let attachedInputArgs = null;
    const fakeBus = createFakeBus();
    const moveByCalls = [];

    await bootApp({
      fetch: fetchShouldNotBeCalled,
      document: fakeDocument,
      window: {},
      bus: fakeBus,
      loadGame: createLoadGame(),
      createCamera: () => ({
        moveBy(dx, dy) {
          moveByCalls.push([dx, dy]);
        },
        getOffset() {
          return { x: 0, y: 0 };
        },
        setFollowTileGetter() {},
        update() {}
      }),
      attachCameraInput: (args) => {
        attachedInputArgs = args;
      }
    });

    attachedInputArgs.camera.moveBy(12, -8);

    expect(fakeBus.emitted).toContainEqual({
      type: APP_COMMAND_CAMERA_PAN_BY,
      detail: { dx: 12, dy: -8 }
    });
    expect(moveByCalls).toEqual([[12, -8]]);
  });

  test('zero movement points does not dispatch move lifecycle facts', async () => {
    const { fakeDocument } = createFakeDocument();

    let attachedInputArgs = null;
    const fakeBus = createFakeBus();

    await bootApp({
      fetch: fetchShouldNotBeCalled,
      document: fakeDocument,
      window: {},
      bus: fakeBus,
      loadGame: createLoadGame({
        width: 2,
        height: 1,
        tiles: [0, 0],
        entities: [{ id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } }]
      }),
      createCamera: () => ({
        setFollowTileGetter() {},
        update() {}
      }),
      createTurnSystem: () => ({
        getRemainingMovementPoints() {
          return 0;
        },
        spendMovementPoints() {},
        endTurn() {}
      }),
      attachCameraInput: (args) => {
        attachedInputArgs = args;
      }
    });

    attachedInputArgs.onTileClick({ x: 1, y: 0 });
    attachedInputArgs.onTileClick({ x: 1, y: 0 });

    const types = fakeBus.emitted.map((entry) => entry.type);
    expect(types).toContain(APP_COMMAND_TILE_CLICKED);
    expect(types).not.toContain(APP_COMMAND_MOVE_REQUESTED);
    expect(types).not.toContain(APP_FACT_MOVE_STARTED);
    expect(types).not.toContain(APP_FACT_MOVE_FINISHED);
  });

});
