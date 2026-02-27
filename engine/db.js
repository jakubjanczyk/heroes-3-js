function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error('IndexedDB request failed'));
    };
  });
}

export function openDb({ name, version, onUpgrade, indexedDB = globalThis.indexedDB }) {
  if (!indexedDB) {
    throw new Error('IndexedDB is not available');
  }

  const request = indexedDB.open(name, version);
  request.onupgradeneeded = () => {
    onUpgrade?.(request.result);
  };
  return requestToPromise(request);
}

export function dbAdd(db, storeName, value) {
  const transaction = db.transaction(storeName, 'readwrite');
  const request = transaction.objectStore(storeName).add(value);
  return requestToPromise(request);
}

export function dbGetAll(db, storeName) {
  const transaction = db.transaction(storeName, 'readonly');
  const request = transaction.objectStore(storeName).getAll();
  return requestToPromise(request);
}

export function dbClear(db, storeName) {
  const transaction = db.transaction(storeName, 'readwrite');
  const request = transaction.objectStore(storeName).clear();
  return requestToPromise(request);
}
