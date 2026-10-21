function noop() {}

function isFunction(value) {
  return typeof value === 'function'
}

function isObject(value) {
  return value !== null && typeof value === 'object'
}

function toList(value) {
  return Array.isArray(value) ? value : []
}

function resolveTarget(target, runtime) {
  if (isFunction(target)) {
    return target(runtime)
  }

  return target
}

function toEventTypeList(value) {
  return Object.freeze([...new Set(toList(value))])
}

// `consumes` and `produces` are lists of event types, or functions of `config` for a module whose
// events depend on the content, such as the facts an interaction outcome emits.
function toEventTypes(value) {
  return isFunction(value) ? value : toEventTypeList(value)
}

function normalizeModuleMeta(meta) {
  const id = typeof meta?.id === 'string' && meta.id.length > 0 ? meta.id : null
  const phase = meta?.phase === 'view' ? 'view' : meta?.phase === 'domain' ? 'domain' : null

  return Object.freeze({
    id,
    phase,
    consumes: toEventTypes(meta?.consumes),
    produces: toEventTypes(meta?.produces)
  })
}

function resolveEventTypes(eventTypes, config) {
  return new Set(isFunction(eventTypes) ? eventTypes(config) : eventTypes)
}

export function createModuleRuntime({ bus, env, config }, meta = normalizeModuleMeta()) {
  const disposers = []
  const consumes = resolveEventTypes(meta.consumes, config)
  const produces = resolveEventTypes(meta.produces, config)

  function registerDisposer(disposer) {
    if (!isFunction(disposer)) {
      return noop
    }

    disposers.push(disposer)
    return disposer
  }

  function on(type, handler, options) {
    if (!consumes.has(type)) {
      throw new Error(`Module "${meta.id}" listens to "${type}" without declaring it in consumes`)
    }

    bus.addEventListener(type, handler, options)

    if (isFunction(bus.removeEventListener)) {
      return registerDisposer(() => {
        bus.removeEventListener(type, handler, options)
      })
    }

    return noop
  }

  function onDom(target, type, handler, options) {
    if (!target?.addEventListener) {
      return noop
    }

    target.addEventListener(type, handler, options)

    return registerDisposer(() => {
      target.removeEventListener?.(type, handler, options)
    })
  }

  function emit(type, detail, options) {
    if (!produces.has(type)) {
      throw new Error(`Module "${meta.id}" emits "${type}" without declaring it in produces`)
    }

    bus.emit(type, detail, options)
  }

  function dispose() {
    while (disposers.length > 0) {
      const disposer = disposers.pop()
      try {
        disposer()
      } catch {}
    }
  }

  return {
    bus,
    env,
    config,
    on,
    onDom,
    emit,
    registerDisposer,
    dispose
  }
}

function assertSubscription(meta, type, handler) {
  if (typeof type !== 'string' || !isFunction(handler)) {
    throw new Error(`Module "${meta.id}" has a subscription without an event type or handler`)
  }
}

export function defineModule(setup, meta = {}) {
  const moduleMeta = normalizeModuleMeta(meta)

  const registerModule = (runtime) => {
    const moduleRuntime = createModuleRuntime(runtime, moduleMeta)
    const moduleDefinition = setup(moduleRuntime)

    if (isFunction(moduleDefinition)) {
      moduleRuntime.registerDisposer(moduleDefinition)
    }

    if (isObject(moduleDefinition)) {
      for (const { type, handler, options } of toList(moduleDefinition.subscriptions)) {
        assertSubscription(moduleMeta, type, handler)
        moduleRuntime.on(type, handler, options)
      }

      for (const { type, handler, options, target } of toList(moduleDefinition.domSubscriptions)) {
        assertSubscription(moduleMeta, type, handler)
        moduleRuntime.onDom(resolveTarget(target, moduleRuntime), type, handler, options)
      }

      moduleRuntime.registerDisposer(moduleDefinition.dispose)
    }

    return () => {
      moduleRuntime.dispose()
    }
  }

  registerModule.meta = moduleMeta
  return registerModule
}
