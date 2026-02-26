import { attachCameraInput as attachCameraInputDefault } from '../engine/input.js';
import { renderEntityLayer as renderEntityLayerDefault } from '../engine/layers/entity-layer.js';
import { renderPathPreviewLayer as renderPathPreviewLayerDefault } from '../engine/layers/path-preview-layer.js';
import { renderTerrainLayer } from '../engine/layers/terrain-layer.js';
import { createDomContext } from './runtime/dom-context.js';
import { createBusDevPanel } from './runtime/bus-dev-panel.js';
import { createSystemContext } from './runtime/system-context.js';
import { startRuntime } from './runtime/start-runtime.js';
import { createWorldContext } from './runtime/world-context.js';

const MAX_MOVEMENT_POINTS = 15;

function defaultBusLogger(entry) {
  const { action, type = '-', subscribers = 0 } = entry;
  console.log(`[bus] ${action} ${type} (subscribers: ${subscribers})`, entry);
}

function composeBusLoggers(...loggers) {
  const enabled = loggers.filter((logger) => typeof logger === 'function');
  if (enabled.length === 0) {
    return null;
  }

  return (entry) => {
    for (const logger of enabled) {
      logger(entry);
    }
  };
}

export async function bootApp({
  fetch = globalThis.fetch,
  document = globalThis.document,
  window = globalThis.window,
  loadGame,
  createMap,
  createOccupancyIndex,
  bus,
  createBus,
  busDebug = false,
  busLogger = defaultBusLogger,
  createCamera,
  attachCameraInput = attachCameraInputDefault,
  renderEntityLayer = renderEntityLayerDefault,
  renderPathPreviewLayer = renderPathPreviewLayerDefault,
  createMovementSystem,
  createTurnSystem,
  createMusicPlayer,
  loadMusicTracks,
  musicTracks,
  musicManifestUrl = '/assets/music/tracks.json',
  AudioCtor = globalThis.Audio
} = {}) {
  const busPanel = busDebug ? createBusDevPanel({ document }) : null;
  const activeBusLogger = composeBusLoggers(busLogger, busPanel?.log);

  const { scenario, map, occupancy, bus: appBus, world } = await createWorldContext({
    fetch,
    loadGame,
    createMap,
    createOccupancyIndex,
    bus,
    createBus,
    busDebug,
    busLogger: activeBusLogger
  });

  const dom = createDomContext(document);
  const systems = await createSystemContext({
    fetch,
    scenario,
    map,
    occupancy,
    bus: appBus,
    viewport: dom.viewport,
    worldElement: dom.worldElement,
    entityLayer: dom.entityLayer,
    maxMovementPoints: MAX_MOVEMENT_POINTS,
    createCamera,
    createMovementSystem,
    createTurnSystem,
    createMusicPlayer,
    loadMusicTracks,
    musicTracks,
    musicManifestUrl,
    AudioCtor
  });

  await startRuntime({
    bus: appBus,
    scenario,
    map,
    occupancy,
    hero: systems.hero,
    maxMovementPoints: MAX_MOVEMENT_POINTS,
    turnSystem: systems.turnSystem,
    movement: systems.movement,
    musicPlayer: systems.musicPlayer,
    camera: systems.camera,
    attachCameraInput,
    renderTerrainLayer,
    renderEntityLayer,
    renderPathPreviewLayer,
    createElement: dom.createElement,
    terrainLayer: dom.terrainLayer,
    entityLayer: dom.entityLayer,
    effectsLayer: dom.effectsLayer,
    uiLayer: dom.uiLayer,
    viewport: dom.viewport,
    window,
    movementPointsStatus: dom.movementPointsStatus,
    endTurnButton: dom.endTurnButton,
    musicToggleButton: dom.musicToggleButton
  });

  const bootStatus = document?.getElementById('boot-status');
  if (bootStatus) {
    bootStatus.textContent = `Boot ok: ${scenario.meta.id}`;
  }

  console.log(`boot ok: ${scenario.meta.id} (entities: ${scenario.entities.length})`);

  return world;
}
