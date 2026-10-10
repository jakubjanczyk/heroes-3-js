async function fetchJson(fetch, url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load ${url} (status ${res.status})`);
  }
  return res.json();
}

async function fetchJsonOrEmpty(fetch, url) {
  const res = await fetch(url);
  if (!res.ok) {
    return {};
  }
  return res.json();
}

function isInBounds(terrain, tile) {
  return (
    tile.x >= 0 &&
    tile.y >= 0 &&
    tile.x < terrain.width &&
    tile.y < terrain.height
  );
}

function isPassableTile(terrain, tile) {
  if (!isInBounds(terrain, tile)) {
    return false;
  }

  const index = tile.y * terrain.width + tile.x;
  return terrain.tiles[index] === 0;
}

function assertEntitiesOnPassableTiles(scenario) {
  const entities = scenario.entities ?? [];

  for (const entity of entities) {
    const tile = entity.tile ?? {};
    if (isPassableTile(scenario.terrain, tile)) {
      continue;
    }

    throw new Error(
      `Entity ${entity.id} (${entity.kind}) must be placed on a passable tile: (${tile.x}, ${tile.y})`
    );
  }
}

function normalizeStaticUrl(url) {
  if (typeof url !== 'string') return url;
  if (url.startsWith('//')) return url;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) return url;
  if (url.startsWith('/')) return `.${url}`;
  return url;
}

export async function loadGame({
  fetch,
  scenarioUrl = '/scenarios/scenario.json',
  dataBaseUrl = '/game/data'
}) {
  if (typeof fetch !== 'function') {
    throw new TypeError('loadGame requires a fetch function');
  }

  const normalizedScenarioUrl = normalizeStaticUrl(scenarioUrl);
  const normalizedDataBaseUrl = normalizeStaticUrl(dataBaseUrl);

  const [scenario, hero, monsters, resources, towns, mines] = await Promise.all([
    fetchJson(fetch, normalizedScenarioUrl),
    fetchJson(fetch, `${normalizedDataBaseUrl}/hero.json`),
    fetchJson(fetch, `${normalizedDataBaseUrl}/monsters.json`),
    fetchJson(fetch, `${normalizedDataBaseUrl}/resources.json`),
    fetchJson(fetch, `${normalizedDataBaseUrl}/towns.json`),
    fetchJsonOrEmpty(fetch, `${normalizedDataBaseUrl}/mines.json`)
  ]);

  assertEntitiesOnPassableTiles(scenario);

  return {
    scenario,
    definitions: {
      hero,
      monsters,
      resources,
      towns,
      mines
    }
  };
}
