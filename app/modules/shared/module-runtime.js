function noop() {}

function isFunction(value) {
  return typeof value === 'function';
}

function isObject(value) {
  return value !== null && typeof value === 'object';
}

function toList(value) {
  return Array.isArray(value) ? value : [];
}

function resolveTarget(target, runtime) {
  if (isFunction(target)) {
    return target(runtime);
  }

  return target;
}

export function createModuleRuntime({ bus, env, config }) {
  const disposers = [];

  function registerDisposer(disposer) {
    if (!isFunction(disposer)) {
      return noop;
    }

    disposers.push(disposer);
    return disposer;
  }

  function on(type, handler, options) {
    bus.addEventListener(type, handler, options);

    if (isFunction(bus.removeEventListener)) {
      return registerDisposer(() => {
        bus.removeEventListener(type, handler, options);
      });
    }

    return noop;
  }

  function onDom(target, type, handler, options) {
    if (!target?.addEventListener) {
      return noop;
    }

    target.addEventListener(type, handler, options);

    return registerDisposer(() => {
      target.removeEventListener?.(type, handler, options);
    });
  }

  function emit(type, detail, options) {
    bus.emit(type, detail, options);
  }

  function dispose() {
    while (disposers.length > 0) {
      const disposer = disposers.pop();
      try {
        disposer();
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
  };
}

export function defineModule(setup) {
  return (runtime, overrides) => {
    const moduleRuntime = createModuleRuntime(runtime);
    const moduleDefinition = setup(moduleRuntime, overrides);

    if (isFunction(moduleDefinition)) {
      moduleRuntime.registerDisposer(moduleDefinition);
    }

    if (isObject(moduleDefinition)) {
      for (const entry of toList(moduleDefinition.subscriptions)) {
        const type = entry?.type;
        const handler = entry?.handler;
        const options = entry?.options;
        if (typeof type !== 'string' || !isFunction(handler)) {
          continue;
        }

        moduleRuntime.on(type, handler, options);
      }

      for (const entry of toList(moduleDefinition.domSubscriptions)) {
        const type = entry?.type;
        const handler = entry?.handler;
        const options = entry?.options;
        if (typeof type !== 'string' || !isFunction(handler)) {
          continue;
        }

        const target = resolveTarget(entry?.target, moduleRuntime);
        moduleRuntime.onDom(target, type, handler, options);
      }

      moduleRuntime.registerDisposer(moduleDefinition.dispose);
    }

    return () => {
      moduleRuntime.dispose();
    };
  };
}
