// Shared utilities for behavior-level tests.
import { expect } from 'vitest';
import { screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';

import { bootApp } from '../../app/boot-app.js';

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
              <button class="hud__button" id="music-toggle-button" type="button" aria-pressed="false">Music: Off</button>
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
  return {
    scenario: {
      meta: { id: 'demo' },
      terrain: { width, height, tiles },
      entities
    },
    definitions: {
      hero: {},
      monsters: {},
      resources: {},
      towns: {}
    }
  };
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

export async function flushMicrotasks(times = 30) {
  for (let i = 0; i < times; i += 1) {
    await Promise.resolve();
  }
}

export async function waitMs(ms = 0) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function createJsonResponse(value) {
  return {
    ok: true,
    status: 200,
    async json() {
      return value;
    }
  };
}

function createGameFetch({ scenario, definitions, musicTracks = [] }) {
  const routeMap = new Map([
    ['./scenarios/scenario.json', scenario],
    ['/scenarios/scenario.json', scenario],
    ['./game/data/hero.json', definitions.hero ?? {}],
    ['/game/data/hero.json', definitions.hero ?? {}],
    ['./game/data/monsters.json', definitions.monsters ?? {}],
    ['/game/data/monsters.json', definitions.monsters ?? {}],
    ['./game/data/resources.json', definitions.resources ?? {}],
    ['/game/data/resources.json', definitions.resources ?? {}],
    ['./game/data/towns.json', definitions.towns ?? {}],
    ['/game/data/towns.json', definitions.towns ?? {}],
    ['./assets/music/tracks.json', musicTracks],
    ['/assets/music/tracks.json', musicTracks]
  ]);

  return async (url) => {
    if (!routeMap.has(url)) {
      return {
        ok: false,
        status: 404,
        async json() {
          return null;
        }
      };
    }

    return createJsonResponse(routeMap.get(url));
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
  viewportSize,
  musicTracks = [],
  AudioCtor,
  movementStepDelayMs = 0,
  appConfig = {}
} = {}) {
  mountAppTemplate();
  if (viewportSize) {
    setViewportSize(viewportSize.width, viewportSize.height);
  }

  const gameData = createLoadGame(loadGameOptions);
  const fetch = createGameFetch({
    scenario: gameData.scenario,
    definitions: gameData.definitions,
    musicTracks
  });

  const movementSleep = (ms) => {
    if (ms <= 0) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  };

  const user = userEvent.setup();

  const world = await bootApp({
    fetch,
    document,
    window,
    ...(AudioCtor ? { AudioCtor } : {}),
    config: {
      musicTracks,
      movementStepDelayMs,
      movementSleep,
      ...appConfig
    }
  });

  return { user, world };
}

export async function setupLinearMovementApp(options = {}) {
  const {
    width,
    heroId,
    heroTile,
    viewportSize,
    musicTracks,
    AudioCtor,
    movementStepDelayMs,
    appConfig
  } = options;
  return setupMovementBehaviorApp({
    loadGameOptions: createLinearScenario({ width, heroId, heroTile }),
    viewportSize,
    musicTracks,
    AudioCtor,
    movementStepDelayMs,
    appConfig
  });
}

export function getTerrainTile(x, y) {
  return document.querySelector(`.terrain-tile[data-x="${x}"][data-y="${y}"]`);
}

export function getHeroEntity() {
  return document.querySelector('.entity--hero[data-entity-id="hero-1"]');
}

export function getMonsterEntity(entityId = 'monster-1') {
  return document.querySelector(`.entity--monster[data-entity-id="${entityId}"]`);
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

export function expectMonsterPresent(entityId = 'monster-1') {
  const monsterEntity = getMonsterEntity(entityId);
  expect(monsterEntity).toBeTruthy();
  return monsterEntity;
}

export function expectMonsterAt(x, y, entityId = 'monster-1') {
  const monsterEntity = expectMonsterPresent(entityId);
  expect(monsterEntity?.dataset.tileX).toBe(String(x));
  expect(monsterEntity?.dataset.tileY).toBe(String(y));
  return monsterEntity;
}

export function expectMonsterNotPresent(entityId = 'monster-1') {
  expect(getMonsterEntity(entityId)).toBeFalsy();
}

export function expectMonsterDefeating(entityId = 'monster-1') {
  expect(getMonsterEntity(entityId)?.className).toContain('entity--monster-defeating');
}

export function getInteractionModal() {
  return document.querySelector('.interaction-modal');
}

export function getInteractionModalMessage() {
  return document.querySelector('.interaction-modal__message');
}

export function getInteractionModalOkButton() {
  return document.querySelector('.interaction-modal__ok-button');
}

export function expectInteractionModalOpen(messageIncludes = null) {
  const modal = getInteractionModal();
  expect(modal).toBeTruthy();

  if (messageIncludes !== null) {
    expect(getInteractionModalMessage()?.textContent ?? '').toContain(messageIncludes);
  }

  return modal;
}

export function expectInteractionModalClosed() {
  expect(getInteractionModal()).toBeFalsy();
}

export async function closeInteractionModal(user) {
  const okButton = getInteractionModalOkButton();
  expect(okButton).toBeTruthy();
  await user.click(okButton);
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
