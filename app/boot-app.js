import { createBus } from '../engine/bus.js';
import {
  APP_COMMAND_APP_START,
  APP_FACT_WORLD_LOAD_FAILED,
  APP_FACT_WORLD_READY
} from './events.js';
import { createBusDevPanel } from './modules/dev/bus-dev-panel.js';
import { registerModules } from './modules/register-modules.js';

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

function createWorldReadyPromise(bus) {
  return new Promise((resolve, reject) => {
    bus.addEventListener(APP_FACT_WORLD_READY, (event) => {
      resolve(event.detail);
    });

    bus.addEventListener(APP_FACT_WORLD_LOAD_FAILED, (event) => {
      reject(event.detail.error);
    });
  });
}

export async function bootApp({
  fetch = globalThis.fetch,
  document = globalThis.document,
  window = globalThis.window,
  AudioCtor = globalThis.Audio,
  bus = null,
  createBus: createBusImpl = createBus,
  busDebug = false,
  busLogger = defaultBusLogger,
  config: configOverride = {},
  musicTracks,
  musicManifestUrl = '/assets/music/tracks.json'
} = {}) {
  const busPanel = busDebug ? createBusDevPanel({ document }) : null;
  const activeBusLogger = composeBusLoggers(busLogger, busPanel?.log);
  const appBus = bus ?? createBusImpl({ debug: busDebug, log: activeBusLogger });

  const env = {
    fetch,
    document,
    window,
    AudioCtor
  };

  const config = {
    maxMovementPoints: MAX_MOVEMENT_POINTS,
    musicTracks,
    musicManifestUrl,
    ...configOverride
  };

  const worldReadyPromise = createWorldReadyPromise(appBus);
  registerModules({
    bus: appBus,
    env,
    config
  });

  appBus.emit(APP_COMMAND_APP_START, {});
  const world = await worldReadyPromise;

  console.log(`boot ok: ${world.scenario.meta.id} (entities: ${world.scenario.entities.length})`);

  return {
    ...world,
    bus: appBus
  };
}
