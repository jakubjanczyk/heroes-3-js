async function fetchJson(fetch, url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load ${url} (status ${res.status})`);
  }
  return res.json();
}

export async function loadGame({
  fetch,
  scenarioUrl = '/scenarios/scenario.json',
  dataBaseUrl = '/game/data'
}) {
  if (typeof fetch !== 'function') {
    throw new TypeError('loadGame requires a fetch function');
  }

  const [scenario, hero, monsters, resources, towns] = await Promise.all([
    fetchJson(fetch, scenarioUrl),
    fetchJson(fetch, `${dataBaseUrl}/hero.json`),
    fetchJson(fetch, `${dataBaseUrl}/monsters.json`),
    fetchJson(fetch, `${dataBaseUrl}/resources.json`),
    fetchJson(fetch, `${dataBaseUrl}/towns.json`)
  ]);

  return {
    scenario,
    definitions: {
      hero,
      monsters,
      resources,
      towns
    }
  };
}
