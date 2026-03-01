// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';

import { createMap } from '../../engine/map.js';
import {
  APP_COMMAND_CAMERA_CENTER_ON_TILE,
  APP_FACT_WORLD_READY,
  APP_UI_CAMERA_UPDATED
} from '../events.js';
import { createFakeBus } from '../../tests/test-utils/fake-bus.js';
import { registerMinimapViewModule } from './minimap-view.module.js';

function mountMinimapTemplate() {
  document.body.innerHTML = `
    <div class="ui-layer" aria-label="UI">
      <div class="minimap" aria-label="Minimap">
        <div class="minimap__map" id="minimap-map">
          <div class="minimap__terrain" id="minimap-terrain"></div>
          <div class="minimap__towns" id="minimap-towns"></div>
          <div class="minimap__viewport" id="minimap-viewport"></div>
        </div>
      </div>
    </div>
  `;
}

function createWorldReadyPayload() {
  const map = createMap({
    width: 8,
    height: 6,
    tiles: [
      0, 0, 0, 1, 0, 0, 0, 0,
      0, 1, 0, 1, 0, 0, 0, 0,
      0, 0, 0, 1, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 1, 1, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0
    ]
  });

  return {
    map,
    scenario: {
      entities: [
        { id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } },
        { id: 'town-1', kind: 'TOWN', type: 'CASTLE', tile: { x: 4, y: 3 } }
      ]
    }
  };
}

describe('minimap view module', () => {
  test('renders full minimap terrain and town markers on world-ready', () => {
    mountMinimapTemplate();
    const bus = createFakeBus();

    registerMinimapViewModule({
      bus,
      env: { document, window }
    });

    bus.emit(APP_FACT_WORLD_READY, createWorldReadyPayload());

    const tiles = document.querySelectorAll('.minimap-tile');
    expect(tiles).toHaveLength(48);
    expect(document.querySelector('.minimap-tile[data-x="3"][data-y="0"]')?.className).toContain(
      'minimap-tile--blocked'
    );
    expect(document.querySelector('.minimap-town-marker[data-tile-x="4"][data-tile-y="3"]')).toBeTruthy();
  });

  test('updates minimap viewport box from camera update events', () => {
    mountMinimapTemplate();
    const bus = createFakeBus();

    registerMinimapViewModule({
      bus,
      env: { document, window }
    });

    bus.emit(APP_FACT_WORLD_READY, createWorldReadyPayload());
    bus.emit(APP_UI_CAMERA_UPDATED, {
      offset: { x: -64, y: -32 },
      viewportSize: { width: 96, height: 64 }
    });

    const viewportBox = document.querySelector('#minimap-viewport');
    expect(viewportBox?.style.left).toBe('25%');
    expect(viewportBox?.style.top).toBe('16.666666666666664%');
    expect(viewportBox?.style.width).toBe('37.5%');
    expect(viewportBox?.style.height).toBe('33.33333333333333%');
  });

  test('emits center-on-tile command when user clicks the minimap', () => {
    mountMinimapTemplate();
    const bus = createFakeBus();

    registerMinimapViewModule({
      bus,
      env: { document, window }
    });

    bus.emit(APP_FACT_WORLD_READY, createWorldReadyPayload());

    const minimap = document.querySelector('#minimap-map');
    expect(minimap).toBeTruthy();
    minimap.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 160,
      height: 120,
      right: 160,
      bottom: 120
    });

    minimap?.dispatchEvent(new window.MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      clientX: 90,
      clientY: 70
    }));

    expect(bus.emitted).toContainEqual({
      type: APP_COMMAND_CAMERA_CENTER_ON_TILE,
      detail: { tile: { x: 4, y: 3 } }
    });
  });
});
