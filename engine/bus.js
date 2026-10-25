export function createBus({
  debug = false,
  log = null,
  eventLog = null,
  shouldLogEvent = () => false,
  beforeDispatch = () => {},
  isDeferredWhileDispatching = () => true
} = {}) {
  const listenersByType = new Map()
  const writeLog = typeof log === 'function' ? log : () => {}
  const recordEvent = typeof eventLog?.record === 'function' ? eventLog.record.bind(eventLog) : null
  let isSilent = false
  // For each commit whose listeners are running, innermost last: the commits waiting for them.
  const dispatching = []
  const isDeferred = ({ type }) => isDeferredWhileDispatching(type)

  function debugLog(entry) {
    if (!debug) {
      return
    }

    writeLog(entry)
  }

  function addEventListener(type, handler) {
    const listeners = listenersByType.get(type) ?? new Set()
    listeners.add(handler)
    listenersByType.set(type, listeners)

    debugLog({
      action: 'subscribe',
      type,
      subscribers: listeners.size
    })
  }

  function removeEventListener(type, handler) {
    const listeners = listenersByType.get(type)
    if (!listeners) {
      return
    }

    listeners.delete(handler)
    if (listeners.size === 0) {
      listenersByType.delete(type)
    }

    debugLog({
      action: 'unsubscribe',
      type,
      subscribers: listenersByType.get(type)?.size ?? 0
    })
  }

  function removeAllEventListeners(type) {
    if (typeof type === 'string') {
      listenersByType.delete(type)
      debugLog({
        action: 'remove-all',
        type,
        subscribers: 0
      })
      return
    }

    listenersByType.clear()
    debugLog({
      action: 'remove-all',
      type: '*',
      subscribers: 0
    })
  }

  function record(type, detail, options) {
    const shouldRecord = options?.log !== false && shouldLogEvent(type, detail)
    if (!shouldRecord || !recordEvent) {
      return
    }

    const logDetail =
      typeof structuredClone === 'function'
        ? (() => {
            try {
              return structuredClone(detail)
            } catch {
              return detail
            }
          })()
        : detail

    void recordEvent({ type, detail: logDetail }).catch((error) => {
      debugLog({
        action: 'log-error',
        type,
        detail: {
          message: error instanceof Error ? error.message : String(error)
        },
        subscribers: listenersByType.get(type)?.size ?? 0
      })
    })
  }

  function notify(event) {
    const listeners = [...(listenersByType.get(event.type) ?? [])]

    debugLog({
      action: 'emit',
      type: event.type,
      detail: event.detail,
      subscribers: listeners.length
    })

    if (isSilent) {
      return
    }

    for (const handler of listeners) {
      handler(event)
    }
  }

  // Every event of a commit is recorded and passed to beforeDispatch before any listener hears the
  // first, so no listener sees a decision half applied. What the listeners of a deferring commit
  // emit that defers too waits until all of them are done, so each of them sees the state the
  // commit left, as a replay of the log would.
  function dispatchCommit(commit) {
    const events = commit.map(({ type, detail, options }) => {
      record(type, detail, options)
      const event = { type, detail }
      beforeDispatch(event)
      return event
    })

    const deferredCommits = commit.some(isDeferred) ? [] : null
    dispatching.push(deferredCommits)
    try {
      for (const event of events) {
        notify(event)
      }
    } finally {
      dispatching.pop()
    }

    for (const deferred of deferredCommits ?? []) {
      dispatchCommit(deferred)
    }
  }

  function enqueue(commit) {
    const deferredCommits = dispatching.at(-1)
    if (deferredCommits && commit.some(isDeferred)) {
      deferredCommits.push(commit)
      return
    }

    dispatchCommit(commit)
  }

  function emit(type, detail, options = {}) {
    enqueue([{ type, detail, options }])
  }

  function emitAll(events, options = {}) {
    enqueue(events.map(({ type, detail }) => ({ type, detail, options })))
  }

  return {
    addEventListener,
    removeEventListener,
    removeAllEventListeners,
    emit,
    emitAll,
    get silent() {
      return isSilent
    },
    set silent(value) {
      isSilent = Boolean(value)
    }
  }
}
