import { dbAdd, dbClear, dbGetAll, openDb } from './db.js';

const DEFAULT_DB_NAME = 'heroes-3-js';
const DEFAULT_DB_VERSION = 1;
const DEFAULT_STORE_NAME = 'events';
const EVENT_SCHEMA_VERSION = 1;

function normalizeEntry(entry) {
  return {
    ...entry,
    detail: entry?.detail ?? {}
  };
}

export function createEventLog({
  dbName = DEFAULT_DB_NAME,
  dbVersion = DEFAULT_DB_VERSION,
  storeName = DEFAULT_STORE_NAME,
  now = () => Date.now(),
  openDatabase = openDb,
  add = dbAdd,
  getAll = dbGetAll,
  clear = dbClear
} = {}) {
  let db = null;
  let cache = [];
  let writeQueue = Promise.resolve();

  function queueWrite(task) {
    writeQueue = writeQueue.then(task, task);
    return writeQueue;
  }

  async function init() {
    try {
      db = await openDatabase({
        name: dbName,
        version: dbVersion,
        onUpgrade: (database) => {
          if (database.objectStoreNames.contains(storeName)) {
            return;
          }

          database.createObjectStore(storeName, {
            keyPath: 'id',
            autoIncrement: true
          });
        }
      });

      const storedEntries = await getAll(db, storeName);
      cache = Array.isArray(storedEntries)
        ? storedEntries
            .map((entry) => normalizeEntry(entry))
            .sort((a, b) => Number(a.id ?? 0) - Number(b.id ?? 0))
        : [];
    } catch {
      db = null;
      cache = [];
    }
  }

  async function record(event) {
    return queueWrite(async () => {
      const entry = {
        v: EVENT_SCHEMA_VERSION,
        type: event.type,
        detail: event.detail ?? {},
        at: now()
      };

      if (db) {
        const id = await add(db, storeName, entry);
        const persisted = normalizeEntry({ id, ...entry });
        cache.push(persisted);
        return persisted;
      }

      const nextId = Number(cache.at(-1)?.id ?? 0) + 1;
      const persisted = normalizeEntry({ id: nextId, ...entry });
      cache.push(persisted);
      return persisted;
    });
  }

  function getAllEntries() {
    return [...cache];
  }

  async function reset() {
    await writeQueue;
    if (db) {
      await clear(db, storeName);
    }

    cache = [];
  }

  function hasExistingSession() {
    return cache.length > 0;
  }

  return {
    init,
    record,
    getAll: getAllEntries,
    reset,
    hasExistingSession
  };
}
