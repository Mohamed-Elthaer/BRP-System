// IndexedDB بسيط (key/value) لطابور العمليات الأوفلاين
const DB = "restaurant-erp";
const STORE = "kv";

const open = () =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

export const kvGet = async (key) => {
  const db = await open();
  return new Promise((resolve, reject) => {
    const q = db.transaction(STORE).objectStore(STORE).get(key);
    q.onsuccess = () => resolve(q.result);
    q.onerror = () => reject(q.error);
  });
};

export const kvSet = async (key, value) => {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};
