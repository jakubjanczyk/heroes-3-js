import {
  APP_UI_RESTORE_COMPLETED,
  APP_UI_RESTORE_STARTED
} from './events.js';

function getPersistedFacts(entries) {
  if (!Array.isArray(entries) || entries.length < 1) {
    return [];
  }

  return [...entries].sort((a, b) => Number(a?.id ?? 0) - Number(b?.id ?? 0));
}

async function replayPersistedFacts({ bus, facts }) {
  for (const fact of facts) {
    bus.emit(fact.type, fact.detail ?? {}, { log: false });
  }

  await Promise.resolve();
}

export async function restoreSession({ persistedFacts, appBus }) {
  const facts = getPersistedFacts(persistedFacts);
  if (facts.length < 1) {
    return;
  }

  appBus.emit(APP_UI_RESTORE_STARTED, {});
  try {
    await replayPersistedFacts({
      bus: appBus,
      facts
    });
  } finally {
    appBus.emit(APP_UI_RESTORE_COMPLETED, {});
  }
}
