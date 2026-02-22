import { loadGame } from './game/load.js';

async function boot() {
  const { scenario, definitions } = await loadGame({ fetch: globalThis.fetch });

  const world = { scenario, definitions };
  globalThis.__WORLD__ = world;

  const bootStatus = document.getElementById('boot-status');
  if (bootStatus) {
    bootStatus.textContent = `Boot ok: ${scenario.meta.id}`;
  }

  console.log(`boot ok: ${scenario.meta.id} (entities: ${scenario.entities.length})`);
}

await boot();
