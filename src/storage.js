const DB_NAME = 'huskeliste-db';
const STORE = 'tasks';

export function openTaskStore(indexedDB = globalThis.indexedDB) {
  const dbReady = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath:'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const request = (mode, action) => dbReady.then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode); const store = tx.objectStore(STORE); const req = action(store);
    req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
  }));
  return {
    all: () => request('readonly', s => s.getAll()),
    put: task => request('readwrite', s => s.put(task)),
    remove: id => request('readwrite', s => s.delete(id)),
    clear: () => request('readwrite', s => s.clear())
  };
}
