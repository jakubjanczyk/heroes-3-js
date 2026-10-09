import { createBus } from '../engine/bus.js';
import { createEventLog } from '../engine/eventlog.js';
import { APP_COMMAND_APP_START, shouldPersistFactEvent } from './events.js';
import { createBusDevPanel } from './modules/dev/bus-dev-panel.js';
import { registerModules } from './modules/register-modules.js';
import { restoreSession } from './restore-session.js';
import { createDisposer, createWorld, setupResetListener } from './boot-lifecycle.js';

const MAX_MOVEMENT_POINTS = 15;

function defaultBusLogger(entry) {
  const { action, type = '-', subscribers = 0 } = entry;
  console.log(`[bus] ${action} ${type} (subscribers: ${subscribers})`, entry);
}

function composeBusLoggers(...loggers) {
  const enabled = loggers.filter((logger) => typeof logger === 'function');
  if (enabled.length < 1) {
    return null;
  }

  return (entry) => {
    for (const logger of enabled) {
      logger(entry);
    }
  };
}

function setupAppBus(busDebug, document, busLogger, appEventLog) {
  const busPanel = busDebug ? createBusDevPanel({ document }) : null;
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

  const lifecycle = createDisposer();

  try {
    lifecycle.add(() => {
      appBus.removeAllEventListeners?.();
    });
    lifecycle.add(
      registerModules({
        bus: appBus,
        env,
        config
      })
    );
    lifecycle.add(setupResetListener(appBus, appEventLog, window, lifecycle.dispose));

    const worldPromise = createWorld(appBus);
    appBus.emit(APP_COMMAND_APP_START, {});

    const world = await worldPromise;
    await restoreSession({
      persistedFacts: appEventLog?.getAll?.(),
      appBus
    });

    console.log(`boot ok: ${world.scenario.meta.id} (entities: ${world.scenario.entities.length})`);

    return {
      ...world,
      bus: appBus,
      eventLog: appEventLog,
      dispose: lifecycle.dispose
    };
  } catch (error) {
    lifecycle.dispose();
    throw error;
  }
}
