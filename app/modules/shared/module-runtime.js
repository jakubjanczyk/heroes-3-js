function noop() {}

function isFunction(value) {
  return typeof value === 'function';
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
    const setupCleanup = setup(moduleRuntime, overrides);
    moduleRuntime.registerDisposer(setupCleanup);

    return () => {
      moduleRuntime.dispose();
    };
  };
}
