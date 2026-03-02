import { createBus } from '../engine/bus.js';
import { createEventLog } from '../engine/eventlog.js';
import {
  APP_COMMAND_CAMERA_CENTER_ON_TILE,
  APP_COMMAND_APP_START,
  APP_COMMAND_RESET_SESSION_REQUESTED,
  APP_FACT_WORLD_LOAD_FAILED,
  APP_FACT_WORLD_READY,
  shouldPersistFactEvent
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

function getPersistedFacts(eventLog) {
  const entries = eventLog?.getAll?.();
  if (!Array.isArray(entries) || entries.length === 0) {
    return [];
  }

  return [...entries].sort((a, b) => Number(a?.id ?? 0) - Number(b?.id ?? 0));
}

function setViewportVisibility(document, isVisible) {
  const viewport = document?.querySelector?.('.viewport');
  if (!viewport) {
    return;
  }

  viewport.style.visibility = isVisible ? '' : 'hidden';
}

function setViewportRestoring(document, isRestoring) {
  const viewport = document?.querySelector?.('.viewport');
  if (!viewport) {
    return;
  }

  if (isRestoring) {
    viewport.classList?.add?.('viewport--restoring');
    return;
  }

  viewport.classList?.remove?.('viewport--restoring');
}

async function replayPersistedFacts({ bus, facts }) {
  for (const fact of facts) {
    bus.emit(fact.type, fact.detail ?? {}, { log: false });
  }

  await Promise.resolve();
}

function centerCameraOnHero({ bus, world }) {
  const hero = world?.scenario?.entities?.find?.((entity) => entity.kind === 'HERO') ?? null;
  if (!hero?.tile) {
    return;
  }

  bus.emit(APP_COMMAND_CAMERA_CENTER_ON_TILE, {
    tile: hero.tile
  });
}

export async function bootApp({
  fetch = globalThis.fetch,
  document = globalThis.document,
  window = globalThis.window,
  AudioCtor = globalThis.Audio,
  eventLog = null,
  bus = null,
  createEventLog: createEventLogImpl = createEventLog,
  createBus: createBusImpl = createBus,
  busDebug = false,
  busLogger = defaultBusLogger,
  config: configOverride = {},
  musicTracks,
  musicManifestUrl = '/assets/music/tracks.json'
} = {}) {
  const appEventLog = eventLog ?? createEventLogImpl();
  await appEventLog.init?.();
  const persistedFacts = getPersistedFacts(appEventLog);
  const hasPersistedSession = persistedFacts.length > 0;

  if (hasPersistedSession) {
    setViewportRestoring(document, true);
    setViewportVisibility(document, false);
  }

  const busPanel = busDebug ? createBusDevPanel({ document }) : null;
  const activeBusLogger = composeBusLoggers(busLogger, busPanel?.log);
  const appBus =
    bus ??
    createBusImpl({
      debug: busDebug,
      log: activeBusLogger,
      eventLog: appEventLog,
      shouldLogEvent: shouldPersistFactEvent
    });

  const env = {
    fetch,
    document,
    window,
    AudioCtor,
    eventLog: appEventLog
  };

  const config = {
    maxMovementPoints: MAX_MOVEMENT_POINTS,
    musicTracks,
    musicManifestUrl,
    ...configOverride
  };

  const worldReadyPromise = createWorldReadyPromise(appBus);

  appBus.addEventListener(APP_COMMAND_RESET_SESSION_REQUESTED, () => {
    void (async () => {
      try {
        await appEventLog.reset?.();
      } finally {
        window?.location?.reload?.();
      }
    })();
  });

  registerModules({
    bus: appBus,
    env,
    config
  });

  try {
    appBus.emit(APP_COMMAND_APP_START, {});
    const world = await worldReadyPromise;

    if (hasPersistedSession) {
      await replayPersistedFacts({
        bus: appBus,
        facts: persistedFacts
      });
      centerCameraOnHero({
        bus: appBus,
        world
      });
    }

    console.log(`boot ok: ${world.scenario.meta.id} (entities: ${world.scenario.entities.length})`);

    return {
      ...world,
      bus: appBus,
      eventLog: appEventLog
    };
  } finally {
    if (hasPersistedSession) {
      setViewportVisibility(document, true);
      setViewportRestoring(document, false);
    }
  }
}
