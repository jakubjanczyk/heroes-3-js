async function fetchJson(fetch, url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load ${url} (status ${res.status})`);
  }
  return res.json();
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

  const [scenario, hero, monsters, resources, towns] = await Promise.all([
    fetchJson(fetch, normalizedScenarioUrl),
    fetchJson(fetch, `${normalizedDataBaseUrl}/hero.json`),
    fetchJson(fetch, `${normalizedDataBaseUrl}/monsters.json`),
    fetchJson(fetch, `${normalizedDataBaseUrl}/resources.json`),
    fetchJson(fetch, `${normalizedDataBaseUrl}/towns.json`)
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
