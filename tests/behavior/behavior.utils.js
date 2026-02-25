// Shared utilities for behavior-level tests.
import { expect } from 'vitest';
import { screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';

import { bootApp } from '../../app/boot-app.js';
import { createMovementSystem as createMovementSystemDefault } from '../../game/systems/movement-system.js';

export function mountAppTemplate() {
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

export function createLoadGame({
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

export function createLinearScenario({
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

export async function fetchShouldNotBeCalled() {
  throw new Error('fetch should not be called in this test');
}

export async function flushMicrotasks(times = 30) {
  for (let i = 0; i < times; i += 1) {
    await Promise.resolve();
  }
}

export function createFakeCamera() {
  return {
    moveBy() {},
    setFollowTileGetter() {},
    update() {},
    clearPan() {},
    lockFollow() {},
    unlockFollow() {},
    centerOnTile() {},
    getOffset() {
      return { x: 0, y: 0 };
    }
  };
}

export function createTrackedCamera() {
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

export function setViewportSize(width, height) {
  const viewport = document.querySelector('.viewport');
  expect(viewport).toBeTruthy();
  Object.defineProperty(viewport, 'clientWidth', {
    value: width,
    configurable: true
  });
  Object.defineProperty(viewport, 'clientHeight', {
    value: height,
    configurable: true
  });
  viewport.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    right: width,
    bottom: height
  });
}

export async function setupMovementBehaviorApp({
  loadGameOptions,
  movementSystemOptions,
  renderPathPreviewLayer,
  attachCameraInput,
  createCamera,
  viewportSize
} = {}) {
  mountAppTemplate();
  if (viewportSize) {
    setViewportSize(viewportSize.width, viewportSize.height);
  }

  const user = userEvent.setup();
  const fakeCamera = createFakeCamera();
  let camera = null;

  await bootApp({
    fetch: fetchShouldNotBeCalled,
    document,
    window,
    loadGame: createLoadGame(loadGameOptions),
    createCamera: (args) => {
      camera = createCamera ? createCamera(args) : fakeCamera;
      return camera;
    },
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

export async function setupLinearMovementApp(options = {}) {
  const {
    width,
    heroId,
    heroTile,
    movementSystemOptions,
    renderPathPreviewLayer,
    attachCameraInput,
    createCamera,
    viewportSize
  } = options;
  return setupMovementBehaviorApp({
    loadGameOptions: createLinearScenario({ width, heroId, heroTile }),
    movementSystemOptions,
    renderPathPreviewLayer,
    attachCameraInput,
    createCamera,
    viewportSize
  });
}

export function getTerrainTile(x, y) {
  return document.querySelector(`.terrain-tile[data-x="${x}"][data-y="${y}"]`);
}

export function getHeroEntity() {
  return document.querySelector('.entity--hero[data-entity-id="hero-1"]');
}

export function expectHeroAt(x, y) {
  const heroEntity = getHeroEntity();
  expect(heroEntity).toBeTruthy();
  expect(heroEntity?.dataset.tileX).toBe(String(x));
  expect(heroEntity?.dataset.tileY).toBe(String(y));
  return heroEntity;
}

export function expectMovementPoints(current, max = 15) {
  expect(screen.getByText(`MP: ${current} / ${max}`)).toBeTruthy();
}

export function expectHasOverLimitTargetMarker() {
  expect(document.querySelector('.path-preview-target-line-over-limit')).toBeTruthy();
}

export function getPreviewSvg() {
  return document.querySelector('.effects-layer .path-preview-svg');
}

export function getPreviewDashAt(x, y) {
  return document.querySelector(`.path-preview-dash[data-x="${x}"][data-y="${y}"]`);
}

export function getPreviewCornerAt(x, y) {
  return document.querySelector(`.path-preview-corner[data-x="${x}"][data-y="${y}"]`);
}

export function getPreviewTargetAt(x, y) {
  return document.querySelector(`.path-preview-target[data-x="${x}"][data-y="${y}"]`);
}

export function getPreviewOverLimitDashAt(x, y) {
  return document.querySelector(`.path-preview-dash-over-limit[data-x="${x}"][data-y="${y}"]`);
}

export function hasOverLimitTargetLineAt(x, y) {
  const target = getPreviewTargetAt(x, y);
  if (!target) {
    return false;
  }
  return Boolean(target.querySelector('.path-preview-target-line-over-limit'));
}

export function expectPreviewDashAt(x, y) {
  expect(getPreviewDashAt(x, y)).toBeTruthy();
}

export function expectPreviewCornerAt(x, y) {
  expect(getPreviewCornerAt(x, y)).toBeTruthy();
}

export function expectPreviewTargetAt(x, y) {
  expect(getPreviewTargetAt(x, y)).toBeTruthy();
}

export function expectPreviewOverLimitDashAt(x, y) {
  expect(getPreviewOverLimitDashAt(x, y)).toBeTruthy();
}

export function expectPreviewOverLimitTargetAt(x, y) {
  expect(hasOverLimitTargetLineAt(x, y)).toBe(true);
}

export function expectPreviewNotOverLimitTargetAt(x, y) {
  expect(hasOverLimitTargetLineAt(x, y)).toBe(false);
}

export function expectNoPreview() {
  expect(document.querySelector('.path-preview-svg')).toBeFalsy();
  expect(document.querySelector('.path-preview-target')).toBeFalsy();
}

export async function confirmMove(user, x, y) {
  const tile = getTerrainTile(x, y);
  expect(tile).toBeTruthy();
  await user.click(tile);
  await user.click(tile);
}

export async function clickTile(user, x, y) {
  const tile = getTerrainTile(x, y);
  expect(tile).toBeTruthy();
  await user.click(tile);
}

export function dispatchTileClick(x, y) {
  const tile = getTerrainTile(x, y);
  expect(tile).toBeTruthy();
  tile?.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
}

export function confirmTileClickByDispatch(x, y) {
  dispatchTileClick(x, y);
  dispatchTileClick(x, y);
}

export function getEndTurnButton() {
  return document.querySelector('#end-turn-button');
}

export async function clickEndTurn(user) {
  const endTurnButton = getEndTurnButton();
  expect(endTurnButton).toBeTruthy();
  await user.click(endTurnButton);
}
