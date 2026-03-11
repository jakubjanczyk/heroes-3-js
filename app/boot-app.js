import {createBus} from '../engine/bus.js';
import {createEventLog} from '../engine/eventlog.js';
import {
  APP_COMMAND_APP_START,
  APP_COMMAND_RESET_SESSION_REQUESTED,
  APP_FACT_WORLD_LOAD_FAILED,
  APP_FACT_WORLD_READY,
  shouldPersistFactEvent
} from './events.js';
import {createBusDevPanel} from './modules/dev/bus-dev-panel.js';
import {registerModules} from './modules/register-modules.js';
import {restoreSession} from './restore-session.js';

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

function createWorld(bus) {
  return new Promise((resolve, reject) => {
    bus.addEventListener(APP_FACT_WORLD_READY, (event) => {
      resolve(event.detail);
    });

    bus.addEventListener(APP_FACT_WORLD_LOAD_FAILED, (event) => {
      reject(event.detail.error);
    });
  });
}

function setupResetListener(appBus, appEventLog, window) {
  appBus.addEventListener(APP_COMMAND_RESET_SESSION_REQUESTED, () => {
    void (async () => {
      try {
        await appEventLog.reset?.();
      } finally {
        window?.location?.reload?.();
      }
    })();
  });
}

function setupAppBus(busDebug, document, busLogger, appEventLog) {
  const busPanel = busDebug ? createBusDevPanel({document}) : null;
  const activeBusLogger = composeBusLoggers(busLogger, busPanel?.log);
  return createBus({
    debug: busDebug,
    log: activeBusLogger,
    eventLog: appEventLog,
    shouldLogEvent: shouldPersistFactEvent
  });
}

export async function bootApp({
  fetch = globalThis.fetch,
  document = globalThis.document,
  window = globalThis.window,
  AudioCtor = globalThis.Audio,
  eventLog = null,
  busDebug = false,
  busLogger = defaultBusLogger,
  config: configOverride = {},
  musicTracks,
  musicManifestUrl = '/assets/music/tracks.json'
} = {}) {
  const appEventLog = eventLog ?? createEventLog();
  await appEventLog.init?.();

  const appBus = setupAppBus(busDebug, document, busLogger, appEventLog);

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

  setupResetListener(appBus, appEventLog, window);

  registerModules({
    bus: appBus,
    env,
    config
  });

  appBus.emit(APP_COMMAND_APP_START, {});

  const world = await createWorld(appBus);
  await restoreSession({
    persistedFacts: appEventLog?.getAll?.(),
    appBus
  });

  console.log(`boot ok: ${world.scenario.meta.id} (entities: ${world.scenario.entities.length})`);

  return {
    ...world,
    bus: appBus,
    eventLog: appEventLog
  };
}
