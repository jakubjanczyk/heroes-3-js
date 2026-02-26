import { renderEntityLayer as renderEntityLayerDefault } from '../../engine/layers/entity-layer.js';
import {
  APP_FACT_HERO_MOVED,
  APP_FACT_MONSTER_DEFEATED,
  APP_FACT_RESOURCE_COLLECTED,
  APP_FACT_WORLD_READY
} from '../events.js';

export function registerEntityViewModule(
  { bus, env },
  {
    renderEntityLayer = renderEntityLayerDefault
  } = {}
) {
  const entityLayer = env.document?.querySelector('.entity-layer');
  const createElement = env.document?.createElement?.bind(env.document);

  let map = null;
  let entities = null;

  function render() {
    if (!entityLayer || !map || !entities) {
      return;
    }

    renderEntityLayer({
      container: entityLayer,
      map,
      entities,
      createElement
    });
  }

  bus.addEventListener(APP_FACT_WORLD_READY, (event) => {
    map = event.detail.map;
    entities = event.detail.scenario.entities;
    render();
  });

  bus.addEventListener(APP_FACT_HERO_MOVED, () => {
    render();
  });

  bus.addEventListener(APP_FACT_MONSTER_DEFEATED, () => {
    render();
  });

  bus.addEventListener(APP_FACT_RESOURCE_COLLECTED, () => {
    render();
  });
}
