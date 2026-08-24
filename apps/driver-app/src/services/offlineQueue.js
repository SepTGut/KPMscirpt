/**
 * IndexedDB Offline Queue Manager
 * Stores pending status updates and photos when connection is lost
 */

const DB_NAME = 'kpm_driver_db'
const DB_VERSION = 1
const STORE_NAME = 'pending_updates'

function openDB() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      return reject(new Error('IndexedDB tidak didukung pada browser ini.'))
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
      }
    }
    request.onsuccess = (e) => resolve(e.target.result)
    request.onerror = (e) => reject(e.target.error)
  })
}

export async function enqueueUpdate(payload) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const item = {
      ...payload,
      createdAt: new Date().toISOString(),
      attempts: 0
    }
    const req = store.add(item)
    req.onsuccess = () => resolve(req.result)
    req.onerror = (e) => reject(e.target.error)
  })
}

export async function getPendingUpdates() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = (e) => reject(e.target.error)
  })
}

export async function removePendingUpdate(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.delete(id)
    req.onsuccess = () => resolve(true)
    req.onerror = (e) => reject(e.target.error)
  })
}

export async function clearPendingUpdates() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.clear()
    req.onsuccess = () => resolve(true)
    req.onerror = (e) => reject(e.target.error)
  })
}
