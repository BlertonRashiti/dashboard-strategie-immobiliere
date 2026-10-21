const DB_NAME = 'strategie-immobiliere';
const DB_VERSION = 1;

let dbPromise;
function db() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const d = req.result;
      d.createObjectStore('snapshots', { keyPath: 'id' });
      d.createObjectStore('geo', { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function tx(store, mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction(store, mode);
    const res = fn(t.objectStore(store));
    t.oncomplete = () => resolve(res?.result);
    t.onerror = () => reject(t.error);
  });
}

async function sha256(buffer) {
  const h = await crypto.subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const listSnapshots = async () =>
  ((await tx('snapshots', 'readonly', (s) => s.getAll())) || [])
    .map(({ rows, communes, ...meta }) => ({ ...meta, nbLignes: rows.length }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

const getSnapshot = (id) => tx('snapshots', 'readonly', (s) => s.get(id));
const deleteSnapshot = (id) => tx('snapshots', 'readwrite', (s) => s.delete(id));

async function saveSnapshot({ rows, communes, meta }, { fileName, hash, label }) {
  const existing = (await tx('snapshots', 'readonly', (s) => s.getAll())) || [];
  const dup = existing.find((s) => s.hash === hash);
  if (dup) return { snapshot: dup, duplicate: true };
  const snapshot = {
    id: `${Date.now().toString(36)}-${hash.slice(0, 8)}`,
    schema: SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    label: label || meta.sourceDate || fileName,
    sourceDate: meta.sourceDate,
    fileName,
    hash,
    rows,
    communes,
  };
  await tx('snapshots', 'readwrite', (s) => s.put(snapshot));
  return { snapshot, duplicate: false };
}

const getGeo = (key) => tx('geo', 'readonly', (s) => s.get(key));
const putGeo = (entry) => tx('geo', 'readwrite', (s) => s.put(entry));
const clearGeo = () => tx('geo', 'readwrite', (s) => s.clear());
const allGeo = async () => (await tx('geo', 'readonly', (s) => s.getAll())) || [];
