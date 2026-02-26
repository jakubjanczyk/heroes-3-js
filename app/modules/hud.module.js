import {
  APP_COMMAND_END_TURN_REQUESTED,
  APP_COMMAND_MUSIC_TOGGLE_REQUESTED,
  APP_FACT_MOVEMENT_POINTS_CHANGED,
  APP_FACT_WORLD_READY,
  APP_UI_MUSIC_STATE_CHANGED
} from '../events.js';

export function registerHudModule({ bus, env }) {
  const uiLayer = env.document?.querySelector('.ui-layer');
  const movementPointsStatus = env.document?.getElementById('movement-points-status');
  const endTurnButton = env.document?.getElementById('end-turn-button');
  const musicToggleButton = env.document?.getElementById('music-toggle-button');
  const bootStatus = env.document?.getElementById('boot-status');

  if (endTurnButton) {
    endTurnButton.addEventListener('click', (event) => {
      event?.stopPropagation?.();
      bus.emit(APP_COMMAND_END_TURN_REQUESTED, {});
    });
  }

  if (musicToggleButton) {
    musicToggleButton.addEventListener('click', (event) => {
      event?.stopPropagation?.();
      bus.emit(APP_COMMAND_MUSIC_TOGGLE_REQUESTED, {});
    });
  }

  if (uiLayer) {
    uiLayer.addEventListener('click', (event) => {
      event?.stopPropagation?.();
    });
  }

  bus.addEventListener(APP_FACT_MOVEMENT_POINTS_CHANGED, (event) => {
    if (!movementPointsStatus) {
      return;
    }

    const { value, max } = event.detail;
    movementPointsStatus.textContent = `MP: ${value} / ${max}`;
  });

  bus.addEventListener(APP_UI_MUSIC_STATE_CHANGED, (event) => {
    if (!musicToggleButton) {
      return;
    }

    const enabled = Boolean(event.detail.enabled);
    musicToggleButton.textContent = enabled ? 'Music: On' : 'Music: Off';
    musicToggleButton.setAttribute?.('aria-pressed', enabled ? 'true' : 'false');
  });

  bus.addEventListener(APP_FACT_WORLD_READY, (event) => {
    if (!bootStatus) {
      return;
    }

    bootStatus.textContent = `Boot ok: ${event.detail.scenario.meta.id}`;
  });
}
