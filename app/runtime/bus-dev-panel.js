function safeSerialize(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
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

  const counter = document.createElement('div');
  counter.className = 'bus-dev-panel__counter';
  counter.textContent = 'Events: 0';

  const list = document.createElement('ol');
  list.className = 'bus-dev-panel__list';

  let isOpen = false;
  let totalEvents = 0;

  function updateToggleText() {
    toggle.textContent = isOpen ? 'Hide bus events' : 'Show bus events';
  }

  toggle.addEventListener('click', () => {
    isOpen = !isOpen;
    body.hidden = !isOpen;
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    updateToggleText();
  });

  updateToggleText();
  body.append(counter, list);
  root.append(toggle, body);
  document.body.append(root);

  function log(entry) {
    if (entry?.action !== 'emit') {
      return;
    }

    totalEvents += 1;
    counter.textContent = `Events: ${totalEvents}`;

    const row = document.createElement('li');
    row.className = 'bus-dev-panel__event';
    const detail = safeSerialize(entry.detail);
    row.textContent = `${entry.type} | subscribers: ${entry.subscribers ?? 0} | detail: ${detail}`;
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
