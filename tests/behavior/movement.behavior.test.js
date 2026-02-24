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
    mountAppTemplate();

    const user = userEvent.setup();
    const fakeCamera = {
      moveBy() {},
      setFollowTileGetter() {},
      update() {},
      clearPan() {},
      lockFollow() {},
      unlockFollow() {},
      centerOnTile() {}
    };

    await bootApp({
      fetch: fetchShouldNotBeCalled,
      document,
      window,
      loadGame: createLoadGame(),
      createCamera: () => fakeCamera,
      createMovementSystem: (args) => createMovementSystemDefault({
        ...args,
        sleep: async () => {},
        stepDelayMs: 0
      })
    });

    const getDestinationTile = () => document.querySelector('.terrain-tile[data-x="2"][data-y="0"]');
    expect(getDestinationTile()).toBeTruthy();
    await user.click(getDestinationTile());
    await user.click(getDestinationTile());
    await flushMicrotasks();

    const heroEntity = document.querySelector('.entity--hero[data-entity-id="hero-1"]');
    expect(heroEntity).toBeTruthy();
    expect(heroEntity?.dataset.tileX).toBe('2');
    expect(heroEntity?.dataset.tileY).toBe('0');
    expect(screen.getByText('MP: 13 / 15')).toBeTruthy();
  });

  test.todo('given path longer than remaining MP when player confirms then hero moves only up to limit and stops');
  test.todo('given hero stopped at MP limit when player confirms same red target again then path remains and hero does not move');
  test.todo('given MP is zero when player confirms any move then hero does not move');
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
