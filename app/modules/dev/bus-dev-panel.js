function safeSerialize(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return '[unserializable]';
  }
}

function getEventKind(type) {
  if (type?.startsWith('command.')) {
    return 'command';
  }

  if (type?.startsWith('fact.')) {
    return 'fact';
  }

  if (type?.startsWith('ui.')) {
    return 'ui';
  }

  return 'other';
}

function formatDetail(detail, maxLength = 520) {
  const text = safeSerialize(detail);
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}...`;
}

export function createBusDevPanel({ document, maxEntries = 120 } = {}) {
  if (!document?.body || !document.createElement) {
    return {
      log() {},
      destroy() {}
    };
  }

  const existing = document.querySelector('.bus-dev-panel');
  existing?.remove?.();

  const root = document.createElement('section');
  root.className = 'bus-dev-panel';
  root.setAttribute('aria-label', 'Event bus debug panel');

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'bus-dev-panel__toggle';
  toggle.setAttribute('aria-expanded', 'false');

  const body = document.createElement('div');
  body.className = 'bus-dev-panel__body';
  body.hidden = true;

  const header = document.createElement('div');
  header.className = 'bus-dev-panel__header';

  const title = document.createElement('div');
  title.className = 'bus-dev-panel__title';
  title.textContent = 'Event Bus';

  const counter = document.createElement('div');
  counter.className = 'bus-dev-panel__counter';
  counter.textContent = 'Events: 0';

  const clearButton = document.createElement('button');
  clearButton.type = 'button';
  clearButton.className = 'bus-dev-panel__clear';
  clearButton.textContent = 'Clear';

  const list = document.createElement('ol');
  list.className = 'bus-dev-panel__list';

  let isOpen = false;
  let totalEvents = 0;

  function updateCounter() {
    counter.textContent = `Events: ${totalEvents}`;
  }

  function updateToggleText() {
    const label = isOpen ? 'Hide bus events' : 'Show bus events';
    toggle.textContent = `${label} (${totalEvents})`;
  }

  toggle.addEventListener('click', () => {
    isOpen = !isOpen;
    body.hidden = !isOpen;
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    updateToggleText();
  });

  clearButton.addEventListener('click', () => {
    totalEvents = 0;
    list.replaceChildren();
    updateCounter();
    updateToggleText();
  });

  updateCounter();
  updateToggleText();
  header.append(title, counter, clearButton);
  body.append(header, list);
  root.append(toggle, body);
  document.body.append(root);

  function log(entry) {
    if (entry?.action !== 'emit') {
      return;
    }

    totalEvents += 1;
    updateCounter();
    updateToggleText();

    const row = document.createElement('li');
    const kind = getEventKind(entry.type);
    row.className = `bus-dev-panel__event bus-dev-panel__event--${kind}`;

    const meta = document.createElement('div');
    meta.className = 'bus-dev-panel__meta';

    const kindBadge = document.createElement('span');
    kindBadge.className = `bus-dev-panel__kind bus-dev-panel__kind--${kind}`;
    kindBadge.textContent = kind;

    const typeLabel = document.createElement('code');
    typeLabel.className = 'bus-dev-panel__type';
    typeLabel.textContent = entry.type;

    const subscribers = document.createElement('span');
    subscribers.className = 'bus-dev-panel__subscribers';
    subscribers.textContent = `subs: ${entry.subscribers ?? 0}`;

    const detail = document.createElement('pre');
    detail.className = 'bus-dev-panel__detail';
    detail.textContent = formatDetail(entry.detail);

    meta.append(kindBadge, typeLabel, subscribers);
    row.append(meta, detail);
    list.prepend(row);

    while (list.children.length > maxEntries) {
      list.removeChild(list.lastChild);
    }
  }

  return {
    log,
    destroy() {
      root.remove();
    }
  };
}
