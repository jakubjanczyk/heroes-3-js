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

async function setupMovementBehaviorApp({ loadGameOptions } = {}) {
  mountAppTemplate();

  const user = userEvent.setup();
  const fakeCamera = createFakeCamera();

  await bootApp({
    fetch: fetchShouldNotBeCalled,
    document,
    window,
    loadGame: createLoadGame(loadGameOptions),
    createCamera: () => fakeCamera,
    createMovementSystem: (args) => createMovementSystemDefault({
      ...args,
      sleep: async () => {},
      stepDelayMs: 0
    })
  });

  return { user, fakeCamera };
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
    const { user } = await setupMovementBehaviorApp({
      loadGameOptions: {
        width: 20,
        height: 1,
        tiles: new Array(20).fill(0),
        entities: [{ id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } }]
      }
    });

    await confirmMove(user, 16, 0);
    await flushMicrotasks();

    expectHeroAt(15, 0);
    expectMovementPoints(0);
  });
  test('given hero stopped at MP limit when player confirms same red target again then path remains and hero does not move', async () => {
    const { user } = await setupMovementBehaviorApp({
      loadGameOptions: {
        width: 20,
        height: 1,
        tiles: new Array(20).fill(0),
        entities: [{ id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } }]
      }
    });

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
    const { user } = await setupMovementBehaviorApp({
      loadGameOptions: {
        width: 20,
        height: 1,
        tiles: new Array(20).fill(0),
        entities: [{ id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } }]
      }
    });

    await confirmMove(user, 16, 0);
    await flushMicrotasks();

    expectHeroAt(15, 0);
    expectMovementPoints(0);

    await confirmMove(user, 14, 0);
    await flushMicrotasks();

    expectHeroAt(15, 0);
    expectMovementPoints(0);
  });

  test.todo('given move is in progress when player clicks End turn then End turn is ignored until movement completes');

  test.todo('given movement completed when player clicks End turn then MP resets to 15');

  test.todo('given queued red remainder after End turn then affordable part becomes green based on refreshed MP');
});

describe('app boot behavior', () => {
  test.todo('given app starts when scenario loads then terrain tiles are rendered from data');

  test.todo('given app starts when hero exists then hero is rendered with expected entity id');

  test.todo('given app starts when HUD loads then movement points show 15 out of 15');

  test.todo('given HUD is outside viewport when user clicks End turn then no map tile selection occurs');
});

describe('path preview behavior', () => {
  test.todo('given reachable destination when player clicks once then preview path and target X are shown');

  test.todo('given previewed destination when player clicks same tile second time then movement starts');

  test.todo('given preview exists when player clicks different reachable tile then preview retargets to new tile');

  test.todo('given preview exists when player clicks unreachable tile then preview clears');

  test.todo('given path exceeds remaining movement points when preview is shown then over-limit segments are red');

  test.todo('given path exceeds remaining movement points when preview is shown then target X is red');
});

describe('camera behavior during movement', () => {
  test.todo('given movement starts when hero begins stepping then camera recenters on hero immediately');

  test.todo('given movement is running when hero advances each step then camera follows each step');

  test.todo('given movement finishes when hero stops then camera unlocks follow mode');
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
