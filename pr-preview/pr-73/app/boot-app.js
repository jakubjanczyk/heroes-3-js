import { createBus } from '../engine/bus.js'
import { createEventLog } from '../engine/eventlog.js'
import { createDisposer, createWorld, setupResetListener } from './boot-lifecycle.js'
import {
  APP_COMMAND_APP_START,
  APP_UI_DEV_FOG_OF_WAR_CHANGED,
  shouldPersistFactEvent
} from './events.js'
import { createGameStateStore } from './game-state.js'
import { heroesAppContent } from './heroes/content.js'
import { createBusDevPanel } from './modules/dev/bus-dev-panel.js'
import { createDevViewState } from './modules/dev/dev-view-state.js'
import { registerModules } from './modules/register-modules.js'
import { restoreSession } from './restore-session.js'

const MAX_MOVEMENT_POINTS = 1500

function defaultBusLogger(entry) {
  const { action, type = '-', subscribers = 0 } = entry
  console.log(`[bus] ${action} ${type} (subscribers: ${subscribers})`, entry)
}

function composeBusLoggers(...loggers) {
  const enabled = loggers.filter((logger) => typeof logger === 'function')
  if (enabled.length < 1) {
    return null
  }

  return (entry) => {
    for (const logger of enabled) {
      logger(entry)
    }
  }
}

function setupAppBus({ busDebug, document, busLogger, appEventLog, store, devViewState }) {
  const busPanel = busDebug ? createBusDevPanel({ document }) : null
  const activeBusLogger = composeBusLoggers(busLogger, busPanel?.log)

  const bus = createBus({
    debug: busDebug,
    log: activeBusLogger,
    eventLog: appEventLog,
    shouldLogEvent: shouldPersistFactEvent,
    beforeDispatch: store.apply
  })

  busPanel?.addToggle({
    label: 'Fog of war',
    checked: true,
    onChange: (enabled) => {
      devViewState.setFogOfWar(enabled)
      bus.emit(APP_UI_DEV_FOG_OF_WAR_CHANGED, { enabled })
    }
  })

  return bus
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
  const appEventLog = eventLog ?? createEventLog()
  await appEventLog.init?.()

  const env = {
    fetch,
    document,
    window,
    AudioCtor
  }
  const config = {
    content: heroesAppContent,
    maxMovementPoints: MAX_MOVEMENT_POINTS,
    musicTracks,
    musicManifestUrl,
    ...configOverride
  }
  const store = createGameStateStore({ content: config.content, config })
  const devViewState = createDevViewState(store.get)
  const appBus = setupAppBus({
    busDebug,
    document,
    busLogger,
    appEventLog,
    store,
    devViewState
  })

  const lifecycle = createDisposer()

  try {
    lifecycle.add(() => {
      appBus.removeAllEventListeners?.()
    })
    lifecycle.add(
      registerModules({
        bus: appBus,
        env,
        config,
        state: { get: devViewState.get }
      })
    )
    lifecycle.add(setupResetListener(appBus, appEventLog, window, lifecycle.dispose))

    const worldPromise = createWorld(appBus)
    appBus.emit(APP_COMMAND_APP_START, {})

    const world = await worldPromise
    await restoreSession({
      persistedFacts: appEventLog?.getAll?.(),
      appBus
    })

    return {
      ...world,
      bus: appBus,
      eventLog: appEventLog,
      dispose: lifecycle.dispose
    }
  } catch (error) {
    lifecycle.dispose()
    throw error
  }
}
