import { APP_FACT_MOVEMENT_POINTS_CHANGED } from '../events.js';
import { bindUiIntentButtons, bindViewportInput } from './bindings.js';
import { registerCameraController } from './camera-controller.js';
import { registerMovementController } from './movement-controller.js';
import { registerMusicController } from './music-controller.js';
import { registerPreviewController } from './preview-controller.js';
import {
  registerEntityProjection,
  registerHudProjection,
  registerMusicToggleProjection,
  registerPreviewProjection
} from './projections.js';
import { setupTerrainRendering } from './terrain-rendering.js';
import { registerTurnController } from './turn-controller.js';

export async function startRuntime({
  bus,
  scenario,
  map,
  occupancy,
  hero,
  maxMovementPoints,
  turnSystem,
  movement,
  musicPlayer,
  camera,
  attachCameraInput,
  renderTerrainLayer,
  renderEntityLayer,
  renderPathPreviewLayer,
  createElement,
  terrainLayer,
  entityLayer,
  effectsLayer,
  uiLayer,
  viewport,
  window,
  movementPointsStatus,
  endTurnButton,
  musicToggleButton
}) {
  const getHero = () => hero;
  const getRemainingMovementPoints = () => turnSystem.getRemainingMovementPoints();

  registerHudProjection({ bus, movementPointsStatus });
  registerMusicToggleProjection({ bus, musicToggleButton });
  registerEntityProjection({
    bus,
    entityLayer,
    map,
    entities: scenario.entities,
    createElement,
    renderEntityLayer
  });
  registerPreviewProjection({
    bus,
    effectsLayer,
    map,
    createElement,
    renderPathPreviewLayer
  });

  registerPreviewController({
    bus,
    map,
    occupancy,
    getHero,
    getRemainingMovementPoints
  });
  registerMovementController({ bus, movement });
  registerTurnController({ bus, turnSystem, maxMovementPoints });
  registerCameraController({ bus, camera, getHero });

  bindViewportInput({
    bus,
    attachCameraInput,
    camera,
    viewport,
    window,
    map
  });
  bindUiIntentButtons({
    bus,
    endTurnButton,
    musicToggleButton,
    uiLayer
  });

  setupTerrainRendering({
    terrainLayer,
    map,
    createElement,
    renderTerrainLayer,
    window
  });

  bus.emit(APP_FACT_MOVEMENT_POINTS_CHANGED, {
    value: turnSystem.getRemainingMovementPoints(),
    max: maxMovementPoints
  });

  await registerMusicController({ bus, musicPlayer });
}
