/**
 * Real-time GPS Tracking & Geolocation Service for Driver Mobile App
 * Synchronizes live coordinates to Firebase Realtime Database and provides 1-click GMaps navigation
 */

import { reactive } from 'vue'

const DEFAULT_FIREBASE_DB_URL = ''

export const WORKSHOP_COORDINATES = {
  'Candi Sewu': { lat: -7.7495, lng: 110.4932, label: 'Workshop Candi Sewu' },
  'Tiron': { lat: -7.8012, lng: 110.3645, label: 'Workshop Tiron' },
  'Sukosari': { lat: -7.5621, lng: 110.8245, label: 'Workshop Sukosari' },
  'Remul': { lat: -7.5412, lng: 110.7812, label: 'Workshop Remul' }
}

export const trackingState = reactive({
  isTracking: false,
  latitude: null,
  longitude: null,
  accuracy: null,
  speedKmh: 0,
  heading: null,
  lastUpdated: null,
  lastPingSuccess: false,
  errorMessage: '',
  activeKpmCount: 0
})

let watchId = null
let activeDeliveries = []
let activeDriverName = ''
let lastSentTime = 0
const PING_INTERVAL_MS = 10000 // 10 seconds throttle

export function getFirebaseDbUrl() {
  return localStorage.getItem('kpm_firebase_url') || DEFAULT_FIREBASE_DB_URL
}

export function setFirebaseDbUrl(url) {
  if (url && url.trim()) {
    localStorage.setItem('kpm_firebase_url', url.trim().replace(/\/+$/, ''))
  } else {
    localStorage.removeItem('kpm_firebase_url')
  }
}

/**
 * Gets high-accuracy current GPS position for photo checkpoint
 */
export async function getCurrentCoordinates() {
  if (!navigator.geolocation) {
    throw new Error('Geolocation tidak didukung pada perangkat ini.')
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speedKmh: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0,
          timestamp: pos.timestamp || Date.now()
        }
        trackingState.latitude = coords.latitude
        trackingState.longitude = coords.longitude
        trackingState.accuracy = coords.accuracy
        resolve(coords)
      },
      (err) => {
        console.warn('[GPS Current Position Error]', err)
        reject(new Error(`Gagal membaca sinyal GPS: ${err.message || 'Izin lokasi ditolak'}`))
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000
      }
    )
  })
}

/**
 * Sends current position to Firebase Realtime Database
 */
async function syncToFirebase(coords, kpmItem, driverName) {
  const baseUrl = getFirebaseDbUrl()
  if (!baseUrl || !baseUrl.startsWith('http')) return

  const safeKpmKey = String(kpmItem.nomor || kpmItem.kpmId || 'UNKNOWN').replace(/[\/\\.#$\[\]]/g, '_')
  const payload = {
    kpmId: kpmItem.nomor || kpmItem.kpmId,
    driverName: driverName || kpmItem.driver || 'DRIVER',
    status: kpmItem.status || 'Jalan',
    origin: kpmItem.wsAwal || kpmItem.lokasiBerangkat || '-',
    destination: kpmItem.wsTujuan || kpmItem.lokasiTiba || '-',
    proyek: kpmItem.proyek || 'Line Feeding',
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: Math.round(coords.accuracy || 0),
    speedKmh: coords.speedKmh || 0,
    heading: coords.heading || null,
    lastUpdated: Date.now()
  }

  try {
    const url = `${baseUrl}/active_tracking/${encodeURIComponent(safeKpmKey)}.json`
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (res.ok) {
      trackingState.lastPingSuccess = true
    }
  } catch (err) {
    console.warn('[Firebase Sync Error]', err)
    trackingState.lastPingSuccess = false
  }
}

/**
 * Removes active tracking node from Firebase when delivery is completed
 */
export async function clearFirebaseTracking(kpmId) {
  const baseUrl = getFirebaseDbUrl()
  if (!baseUrl || !baseUrl.startsWith('http') || !kpmId) return

  const safeKpmKey = String(kpmId).replace(/[\/\\.#$\[\]]/g, '_')
  try {
    const url = `${baseUrl}/active_tracking/${encodeURIComponent(safeKpmKey)}.json`
    await fetch(url, { method: 'DELETE' })
  } catch (e) {}
}

/**
 * Handles incoming GPS position update from watcher
 */
function onPositionSuccess(pos) {
  const now = Date.now()
  const coords = {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
    speedKmh: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0,
    heading: pos.coords.heading || null,
    timestamp: pos.timestamp || now
  }

  trackingState.latitude = coords.latitude
  trackingState.longitude = coords.longitude
  trackingState.accuracy = Math.round(coords.accuracy || 0)
  trackingState.speedKmh = coords.speedKmh
  trackingState.heading = coords.heading
  trackingState.lastUpdated = new Date().toLocaleTimeString('id-ID')
  trackingState.errorMessage = ''

  // Throttled sync to Firebase
  if (now - lastSentTime >= PING_INTERVAL_MS && activeDeliveries.length > 0) {
    lastSentTime = now
    for (const item of activeDeliveries) {
      syncToFirebase(coords, item, activeDriverName)
    }
  }
}

function onPositionError(err) {
  console.warn('[GPS Watch Error]', err)
  trackingState.errorMessage = err.message || 'Sinyal GPS terputus atau izin lokasi belum aktif.'
}

/**
 * Starts continuous GPS tracking for active 'Jalan' deliveries
 */
export function startTracking(deliveries = [], driverName = '') {
  activeDeliveries = deliveries.filter(d => d.status === 'Jalan')
  activeDriverName = driverName || ''
  trackingState.activeKpmCount = activeDeliveries.length

  if (activeDeliveries.length === 0) {
    stopTracking()
    return
  }

  if (watchId !== null) return // already tracking

  if (!navigator.geolocation) {
    trackingState.errorMessage = 'Geolocation tidak didukung di perangkat ini.'
    return
  }

  trackingState.isTracking = true
  trackingState.errorMessage = ''

  watchId = navigator.geolocation.watchPosition(
    onPositionSuccess,
    onPositionError,
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 5000
    }
  )
}

/**
 * Stops continuous GPS tracking
 */
export function stopTracking() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId)
    watchId = null
  }
  trackingState.isTracking = false
  trackingState.activeKpmCount = 0
}

/**
 * Generates Google Maps navigation URL for destination workshop
 */
export function getNavigationUrl(destinationName) {
  const dest = String(destinationName || '').trim()
  const preset = WORKSHOP_COORDINATES[dest]

  if (preset) {
    return `https://www.google.com/maps/dir/?api=1&destination=${preset.lat},${preset.lng}&travelmode=driving`
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest + ' Workshop')}&travelmode=driving`
}
