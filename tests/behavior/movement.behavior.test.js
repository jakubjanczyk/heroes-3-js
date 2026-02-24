// @vitest-environment jsdom
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';

import { bootApp } from '../../app/boot-app.js';
import { createMovementSystem as createMovementSystemDefault } from '../../game/systems/movement-system.js';

function mountAppTemplate() {
  document.body.innerHTML = `
    <div class="app">
      <div class="game-shell">
        <div class="viewport" aria-label="Viewport">
          <div class="world" aria-label="World">
            <div class="terrain-layer" aria-label="Terrain"></div>
            <div class="entity-layer" aria-label="Entities"></div>
            <div class="effects-layer" aria-label="Effects"></div>
          </div>
        </div>
        <div class="ui-layer" aria-label="UI">
          <div class="hud">
            <div class="hud__title">Heroes 3 JS</div>
            <div class="hud__status" id="boot-status">Booting…</div>
            <div class="hud__row">
              <div class="hud__movement" id="movement-points-status">MP: 15 / 15</div>
              <button class="hud__button" id="end-turn-button" type="button">End turn</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function createLoadGame({
  width = 4,
  height = 1,
  tiles = [0, 0, 0, 0],
  entities = [{ id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } }]
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

function createLinearScenario({
  width = 20,
  heroId = 'hero-1',
  heroTile = { x: 0, y: 0 }
} = {}) {
  return {
    width,
    height: 1,
    tiles: new Array(width).fill(0),
    entities: [{ id: heroId, kind: 'HERO', type: 'HERO', tile: heroTile }]
  };
}

async function fetchShouldNotBeCalled() {
  throw new Error('fetch should not be called in this test');
}

async function flushMicrotasks(times = 30) {
  for (let i = 0; i < times; i += 1) {
    await Promise.resolve();
  }
}

function createFakeCamera() {
  return {
    moveBy() {},
    setFollowTileGetter() {},
    update() {},
    clearPan() {},
    lockFollow() {},
    unlockFollow() {},
    centerOnTile() {}
  };
}

async function setupMovementBehaviorApp({
  loadGameOptions,
  movementSystemOptions,
  renderPathPreviewLayer,
  attachCameraInput,
  createCamera
} = {}) {
  mountAppTemplate();

  const user = userEvent.setup();
  const fakeCamera = createFakeCamera();

  const camera = createCamera ? createCamera() : fakeCamera;

  await bootApp({
    fetch: fetchShouldNotBeCalled,
    document,
    window,
    loadGame: createLoadGame(loadGameOptions),
    createCamera: () => camera,
    ...(renderPathPreviewLayer ? { renderPathPreviewLayer } : {}),
    ...(attachCameraInput ? { attachCameraInput } : {}),
    createMovementSystem: (args) => createMovementSystemDefault({
      ...args,
      sleep: async () => {},
      stepDelayMs: 0,
      ...movementSystemOptions
    })
  });

  return { user, fakeCamera, camera };
}

async function setupLinearMovementApp(options = {}) {
  const {
    width,
    heroId,
    heroTile,
    movementSystemOptions,
    renderPathPreviewLayer,
    attachCameraInput,
    createCamera
  } = options;
  return setupMovementBehaviorApp({
    loadGameOptions: createLinearScenario({ width, heroId, heroTile }),
    movementSystemOptions,
    renderPathPreviewLayer,
    attachCameraInput,
    createCamera
  });
}

function getTerrainTile(x, y) {
  return document.querySelector(`.terrain-tile[data-x="${x}"][data-y="${y}"]`);
}

function getHeroEntity() {
  return document.querySelector('.entity--hero[data-entity-id="hero-1"]');
}

function expectHeroAt(x, y) {
  const heroEntity = getHeroEntity();
  expect(heroEntity).toBeTruthy();
  expect(heroEntity?.dataset.tileX).toBe(String(x));
  expect(heroEntity?.dataset.tileY).toBe(String(y));
  return heroEntity;
}

function expectMovementPoints(current, max = 15) {
  expect(screen.getByText(`MP: ${current} / ${max}`)).toBeTruthy();
}

function expectHasOverLimitTargetMarker() {
  expect(document.querySelector('.path-preview-target-line-over-limit')).toBeTruthy();
}

function getPreviewSvg() {
  return document.querySelector('.effects-layer .path-preview-svg');
}

function getPreviewDashAt(x, y) {
  return document.querySelector(`.path-preview-dash[data-x="${x}"][data-y="${y}"]`);
}

function getPreviewTargetAt(x, y) {
  return document.querySelector(`.path-preview-target[data-x="${x}"][data-y="${y}"]`);
}

function getPreviewOverLimitDashAt(x, y) {
  return document.querySelector(`.path-preview-dash-over-limit[data-x="${x}"][data-y="${y}"]`);
}

function hasOverLimitTargetLineAt(x, y) {
  const target = getPreviewTargetAt(x, y);
  if (!target) {
    return false;
  }
  return Boolean(target.querySelector('.path-preview-target-line-over-limit'));
}

function expectPreviewDashAt(x, y) {
  expect(getPreviewDashAt(x, y)).toBeTruthy();
}

function expectPreviewTargetAt(x, y) {
  expect(getPreviewTargetAt(x, y)).toBeTruthy();
}

function expectPreviewOverLimitDashAt(x, y) {
  expect(getPreviewOverLimitDashAt(x, y)).toBeTruthy();
}

function expectPreviewOverLimitTargetAt(x, y) {
  expect(hasOverLimitTargetLineAt(x, y)).toBe(true);
}

function expectNoPreview() {
  expect(document.querySelector('.path-preview-svg')).toBeFalsy();
  expect(document.querySelector('.path-preview-target')).toBeFalsy();
}

function createTrackedCamera() {
  const centerOnTileCalls = [];
  let lockFollowCalls = 0;
  let unlockFollowCalls = 0;
  return {
    moveBy() {},
    setFollowTileGetter() {},
    update() {},
    clearPan() {},
    lockFollow() {
      lockFollowCalls += 1;
    },
    unlockFollow() {
      unlockFollowCalls += 1;
    },
    centerOnTile(tile) {
      centerOnTileCalls.push(tile);
    },
    centerOnTileCalls,
    get lockFollowCalls() {
      return lockFollowCalls;
    },
    get unlockFollowCalls() {
      return unlockFollowCalls;
    }
  };
}

async function confirmMove(user, x, y) {
  const tile = getTerrainTile(x, y);
  expect(tile).toBeTruthy();
  await user.click(tile);
  await user.click(tile);
}

async function clickTile(user, x, y) {
  const tile = getTerrainTile(x, y);
  expect(tile).toBeTruthy();
  await user.click(tile);
}

function dispatchTileClick(x, y) {
  const tile = getTerrainTile(x, y);
  expect(tile).toBeTruthy();
  tile?.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
}

function confirmTileClickByDispatch(x, y) {
  dispatchTileClick(x, y);
  dispatchTileClick(x, y);
}

function getEndTurnButton() {
  return document.querySelector('#end-turn-button');
}

async function clickEndTurn(user) {
  const endTurnButton = getEndTurnButton();
  expect(endTurnButton).toBeTruthy();
  await user.click(endTurnButton);
}

describe('movement behavior', () => {
  const originalRequestAnimationFrame = window.requestAnimationFrame;

  beforeAll(() => {
    Object.defineProperty(window, 'requestAnimationFrame', {
      value: (callback) => {
        callback(0);
        return 0;
      },
      configurable: true,
      writable: true
    });
  });

  afterAll(() => {
    Object.defineProperty(window, 'requestAnimationFrame', {
      value: originalRequestAnimationFrame,
      configurable: true,
      writable: true
    });
  });

  test('given a fresh turn when player confirms a reachable destination then hero moves and movement points decrease by path length', async () => {
    const { user } = await setupMovementBehaviorApp();

    await confirmMove(user, 2, 0);
    await flushMicrotasks();

    expectHeroAt(2, 0);
    expectMovementPoints(13);
  });

  test('given path longer than remaining MP when player confirms then hero moves only up to limit and stops', async () => {
    const { user } = await setupLinearMovementApp();

    await confirmMove(user, 16, 0);
    await flushMicrotasks();

    expectHeroAt(15, 0);
    expectMovementPoints(0);
  });
  test('given hero stopped at MP limit when player confirms same red target again then path remains and hero does not move', async () => {
    const { user } = await setupLinearMovementApp();

    await confirmMove(user, 16, 0);
    await flushMicrotasks();

    expectHeroAt(15, 0);
    expectMovementPoints(0);
    expectHasOverLimitTargetMarker();

    await clickTile(user, 16, 0);
    await flushMicrotasks();

    expectHeroAt(15, 0);
    expectMovementPoints(0);
    expectHasOverLimitTargetMarker();
  });

  test('given MP is zero when player confirms any move then hero does not move', async () => {
    const { user } = await setupLinearMovementApp();

    await confirmMove(user, 16, 0);
    await flushMicrotasks();

    expectHeroAt(15, 0);
    expectMovementPoints(0);

    await confirmMove(user, 14, 0);
    await flushMicrotasks();

    expectHeroAt(15, 0);
    expectMovementPoints(0);
  });

  test('given move is in progress when player clicks End turn then End turn is ignored until movement completes', async () => {
    let resolveSleep = null;
    const { user } = await setupMovementBehaviorApp({
      loadGameOptions: {
        width: 2,
        height: 1,
        tiles: [0, 0],
        entities: [{ id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } }]
      },
      movementSystemOptions: {
        sleep: () => new Promise((resolve) => {
          resolveSleep = resolve;
        }),
        stepDelayMs: 1
      }
    });

    await confirmMove(user, 1, 0);
    await flushMicrotasks(3);

    expectMovementPoints(14);

    await clickEndTurn(user);
    expectMovementPoints(14);

    resolveSleep?.();
    await flushMicrotasks(3);

    await clickEndTurn(user);
    expectMovementPoints(15);
  });

  test('given movement completed when player clicks End turn then MP resets to 15', async () => {
    const { user } = await setupMovementBehaviorApp();

    await confirmMove(user, 2, 0);
    await flushMicrotasks();

    expectHeroAt(2, 0);
    expectMovementPoints(13);

    await clickEndTurn(user);

    expectMovementPoints(15);
  });

  test('given queued red remainder after End turn then affordable part becomes green based on refreshed MP', async () => {
    const { user } = await setupLinearMovementApp();

    await confirmMove(user, 16, 0);
    await flushMicrotasks();

    expectHeroAt(15, 0);
    expectMovementPoints(0);
    expectHasOverLimitTargetMarker();

    await clickEndTurn(user);

    expectMovementPoints(15);
    expect(document.querySelector('.path-preview-target-line-over-limit')).toBeFalsy();
    expect(document.querySelector('.path-preview-target-line')).toBeTruthy();
  });
});

describe('app boot behavior', () => {
  test('given app starts when scenario loads then terrain tiles are rendered from data', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: {
        width: 3,
        height: 2,
        tiles: [0, 1, 2, 3, 4, 5],
        entities: [{ id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } }]
      }
    });

    const terrainTiles = document.querySelectorAll('.terrain-tile');
    expect(terrainTiles).toHaveLength(6);
    expect(getTerrainTile(0, 0)).toBeTruthy();
    expect(getTerrainTile(2, 1)).toBeTruthy();
  });

  test('given app starts when hero exists then hero is rendered with expected entity id', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: {
        width: 3,
        height: 1,
        tiles: [0, 0, 0],
        entities: [{ id: 'hero-custom', kind: 'HERO', type: 'HERO', tile: { x: 1, y: 0 } }]
      }
    });

    const heroEntity = document.querySelector('.entity--hero[data-entity-id="hero-custom"]');
    expect(heroEntity).toBeTruthy();
    expect(heroEntity?.dataset.tileX).toBe('1');
    expect(heroEntity?.dataset.tileY).toBe('0');
  });

  test('given app starts when HUD loads then movement points show 15 out of 15', async () => {
    await setupMovementBehaviorApp();
    expectMovementPoints(15);
  });

  test('given HUD is outside viewport when user clicks End turn then no map tile selection occurs', async () => {
    const { user } = await setupMovementBehaviorApp();

    await clickEndTurn(user);
    await flushMicrotasks();

    expectHeroAt(0, 0);
    expectMovementPoints(15);
    expectNoPreview();
  });
});

describe('path preview behavior', () => {
  test('given reachable destination when player clicks once then preview path and target X are shown', async () => {
    await setupLinearMovementApp({ width: 4 });

    dispatchTileClick(2, 0);
    await flushMicrotasks();

    expectHeroAt(0, 0);
    expectMovementPoints(15);
    expect(getPreviewSvg()).toBeTruthy();
    expectPreviewDashAt(1, 0);
    expectPreviewTargetAt(2, 0);
  });

  test('given previewed destination when player clicks same tile second time then movement starts', async () => {
    await setupLinearMovementApp({ width: 4 });

    dispatchTileClick(2, 0);
    await flushMicrotasks();

    expect(getPreviewSvg()).toBeTruthy();
    expectPreviewDashAt(1, 0);
    expectPreviewTargetAt(2, 0);
    expectHeroAt(0, 0);

    confirmTileClickByDispatch(2, 0);
    await flushMicrotasks();

    expectHeroAt(2, 0);
    expectMovementPoints(13);
  });

  test('given preview exists when player clicks different reachable tile then preview retargets to new tile', async () => {
    await setupLinearMovementApp({ width: 5 });

    dispatchTileClick(2, 0);
    await flushMicrotasks();

    expectPreviewTargetAt(2, 0);
    expectPreviewDashAt(1, 0);
    expectHeroAt(0, 0);

    dispatchTileClick(3, 0);
    await flushMicrotasks();

    expect(getPreviewTargetAt(2, 0)).toBeFalsy();
    expectPreviewTargetAt(3, 0);
    expectPreviewDashAt(1, 0);
    expectPreviewDashAt(2, 0);
    expectHeroAt(0, 0);
  });

  test('given preview exists when player clicks unreachable tile then preview clears', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: {
        width: 4,
        height: 1,
        tiles: [0, 0, 0, 1],
        entities: [{ id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } }]
      }
    });

    dispatchTileClick(2, 0);
    await flushMicrotasks();
    expect(getPreviewSvg()).toBeTruthy();

    dispatchTileClick(3, 0);
    await flushMicrotasks();

    expectNoPreview();
    expectHeroAt(0, 0);
  });

  test('given path exceeds remaining movement points when preview is shown then over-limit segments are red', async () => {
    await setupLinearMovementApp();

    confirmTileClickByDispatch(10, 0);
    await flushMicrotasks();
    expectHeroAt(10, 0);
    expectMovementPoints(5);

    dispatchTileClick(17, 0);
    await flushMicrotasks();

    expectPreviewTargetAt(17, 0);
    expectPreviewDashAt(11, 0);
    expectPreviewDashAt(15, 0);
    expectPreviewOverLimitDashAt(16, 0);
    expect(getPreviewOverLimitDashAt(15, 0)).toBeFalsy();
  });

  test('given path exceeds remaining movement points when preview is shown then target X is red', async () => {
    await setupLinearMovementApp();

    confirmTileClickByDispatch(10, 0);
    await flushMicrotasks();
    expectHeroAt(10, 0);
    expectMovementPoints(5);

    dispatchTileClick(17, 0);
    await flushMicrotasks();

    expectPreviewTargetAt(17, 0);
    expectPreviewOverLimitTargetAt(17, 0);
  });
});

describe('camera behavior during movement', () => {
  test('given movement starts when hero begins stepping then camera recenters on hero immediately', async () => {
    const trackedCamera = createTrackedCamera();
    await setupLinearMovementApp({
      width: 4,
      createCamera: () => trackedCamera
    });

    confirmTileClickByDispatch(2, 0);
    await flushMicrotasks();

    expect(trackedCamera.centerOnTileCalls[0]).toEqual({ x: 0, y: 0 });
  });

  test('given movement is running when hero advances each step then camera follows each step', async () => {
    const trackedCamera = createTrackedCamera();
    await setupLinearMovementApp({
      width: 4,
      createCamera: () => trackedCamera
    });

    confirmTileClickByDispatch(2, 0);
    await flushMicrotasks();

    expect(trackedCamera.centerOnTileCalls).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 }
    ]);
  });

  test('given movement finishes when hero stops then camera unlocks follow mode', async () => {
    const trackedCamera = createTrackedCamera();
    await setupLinearMovementApp({
      width: 4,
      createCamera: () => trackedCamera
    });

    confirmTileClickByDispatch(2, 0);
    await flushMicrotasks();

    expect(trackedCamera.lockFollowCalls).toBe(1);
    expect(trackedCamera.unlockFollowCalls).toBe(1);
  });
});

describe('end turn behavior', () => {
  test.todo('given hero has spent movement points when player clicks End turn then movement points reset to 15');

  test.todo('given queued over-limit route exists when player clicks End turn then route remains selected');

  test.todo('given queued over-limit route exists when player clicks End turn then previously red affordable segment turns green');

  test.todo('given hero is moving when player clicks End turn then turn is not ended until movement completes');

  test.todo('given movement completes after ignored End turn click when player clicks End turn again then turn ends and movement points reset');

  test.todo('given full path is now affordable after End turn when player confirms same target then hero completes remaining route');

  test.todo('given player retargets route after End turn when clicking a different tile then old queued route is replaced');

  test.todo('given no movement happened this turn when player clicks End turn then movement points remain 15');
});

describe('tile click behavior', () => {
  test.todo('given user clicks rendered terrain tile by data-x/data-y then selected tile matches those coordinates');

  test.todo('given user clicks outside map bounds then no movement or preview is started');

  test.todo('given user clicks HUD controls then tile click handling is not triggered');
});
