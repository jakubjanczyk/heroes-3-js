// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';

import { bootApp } from './boot-app.js';
import { APP_FACT_PREVIEW_TARGET_SELECTED } from './events.js';

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
          <div class="minimap" aria-label="Minimap">
            <div class="minimap__title">Minimap</div>
            <div class="minimap__map" id="minimap-map">
              <div class="minimap__terrain" id="minimap-terrain"></div>
              <div class="minimap__towns" id="minimap-towns"></div>
              <div class="minimap__viewport" id="minimap-viewport"></div>
            </div>
          </div>
          <div class="hud">
            <div class="hud__title">Heroes 3 JS</div>
            <div class="hud__status" id="boot-status">Booting...</div>
            <div class="hud__row">
              <div class="hud__movement" id="movement-points-status">MP: 15 / 15</div>
              <div class="hud__resources" id="resource-totals-status">Resources: none</div>
              <button class="hud__button" id="end-turn-button" type="button">End turn</button>
              <button class="hud__button" id="reset-session-button" type="button">Reset</button>
              <button class="hud__button" id="music-toggle-button" type="button" aria-pressed="false">Music: Off</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function createFakeFetch(routeMap) {
  return async (url) => {
    if (!(url in routeMap)) {
      return {
        ok: false,
        status: 404,
        async json() {
          return null;
        }
      };
    }

    return {
      ok: true,
      status: 200,
      async json() {
        return routeMap[url];
      }
    };
  };
}

function createSpyBus(onEmit) {
  const listenersByType = new Map();
  const emitted = [];

  return {
    emitted,
    addEventListener(type, handler) {
      const listeners = listenersByType.get(type) ?? [];
      listeners.push(handler);
      listenersByType.set(type, listeners);
    },
    emit(type, detail, options) {
      emitted.push({ type, detail, options });
      onEmit?.({ type, detail, options });

      for (const listener of listenersByType.get(type) ?? []) {
        listener({ type, detail });
      }
    }
  };
}

describe('boot app replay', () => {
  test('re-emits persisted facts after world-ready while viewport stays hidden', async () => {
    mountAppTemplate();

    const replayVisibilitySnapshots = [];
    const bus = createSpyBus(({ type, options }) => {
      if (type !== APP_FACT_PREVIEW_TARGET_SELECTED || options?.log !== false) {
        return;
      }

      const viewport = document.querySelector('.viewport');
      replayVisibilitySnapshots.push(viewport?.style.visibility ?? '');
    });

    const eventLog = {
      async init() {},
      getAll() {
        return [
          {
            id: 1,
            type: APP_FACT_PREVIEW_TARGET_SELECTED,
            detail: {
              tile: { x: 2, y: 0 }
            }
          }
        ];
      },
      async record() {},
      async reset() {},
      hasExistingSession() {
        return true;
      }
    };

    const fetch = createFakeFetch({
      './scenarios/scenario.json': {
        meta: { id: 'demo' },
        terrain: { width: 3, height: 1, tiles: [0, 0, 0] },
        entities: [{ id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } }]
      },
      './game/data/hero.json': {},
      './game/data/monsters.json': {},
      './game/data/resources.json': {},
      './game/data/towns.json': {},
      './assets/music/tracks.json': []
    });

    await bootApp({
      fetch,
      document,
      window,
      bus,
      eventLog,
      config: {
        movementStepDelayMs: 0,
        movementSleep: () => Promise.resolve()
      }
    });

    const replayedFacts = bus.emitted.filter(
      (entry) => entry.type === APP_FACT_PREVIEW_TARGET_SELECTED && entry.options?.log === false
    );

    expect(replayedFacts).toHaveLength(1);
    expect(replayVisibilitySnapshots).toEqual(['hidden']);
    expect(document.querySelector('.viewport')?.style.visibility).toBe('');
  });
});
