import {
  APP_FACT_HERO_MOVED,
  APP_FACT_MOVEMENT_POINTS_CHANGED,
  APP_UI_MUSIC_STATE_CHANGED,
  APP_UI_PREVIEW_UPDATED
} from '../events.js';

export function registerHudProjection({ bus, movementPointsStatus }) {
  if (!movementPointsStatus) {
    return;
  }

  bus.addEventListener(APP_FACT_MOVEMENT_POINTS_CHANGED, (event) => {
    const { value, max } = event.detail;
    movementPointsStatus.textContent = `MP: ${value} / ${max}`;
  });
}

export function registerMusicToggleProjection({ bus, musicToggleButton }) {
  if (!musicToggleButton) {
    return;
  }

  bus.addEventListener(APP_UI_MUSIC_STATE_CHANGED, (event) => {
    const enabled = Boolean(event.detail.enabled);
    musicToggleButton.textContent = enabled ? 'Music: On' : 'Music: Off';
    musicToggleButton.setAttribute?.('aria-pressed', enabled ? 'true' : 'false');
  });
}

export function registerEntityProjection({ bus, entityLayer, map, entities, createElement, renderEntityLayer }) {
  if (!entityLayer) {
    return;
  }

  const render = () => {
    renderEntityLayer({
      container: entityLayer,
      map,
      entities,
      createElement
    });
  };

  bus.addEventListener(APP_FACT_HERO_MOVED, () => {
    render();
  });

  render();
}

export function registerPreviewProjection({
  bus,
  effectsLayer,
  map,
  createElement,
  renderPathPreviewLayer
}) {
  if (!effectsLayer) {
    return;
  }

  bus.addEventListener(APP_UI_PREVIEW_UPDATED, (event) => {
    const { path, targetTile, maxAffordableSteps } = event.detail;
    renderPathPreviewLayer({
      container: effectsLayer,
      map,
      path,
      targetTile,
      maxAffordableSteps,
      createElement
    });
  });
}
