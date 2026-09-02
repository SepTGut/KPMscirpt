/**
 * Real-time GPS Tracking & Geolocation Service for Combined Web App
 * Synchronizes live coordinates to Firebase Realtime Database and provides 1-click GMaps navigation
 */

import { reactive } from 'vue'

const DEFAULT_FIREBASE_DB_URL = 'https://linefeedingdbt-default-rtdb.asia-southeast1.firebasedatabase.app'

export const WORKSHOP_COORDINATES = {
  'Candi Sewu': { lat: -7.6162207, lng: 111.5215291, label: 'Workshop Candi Sewu (Jl. Candi Sewu No.30 Madiun)' },
  'Tiron': { lat: -7.5822966, lng: 111.5420679, label: 'Workshop Tiron (Dekat Pengadilan Agama Madiun)' },
  'Sukosari': { lat: -7.6114512, lng: 111.5348394, label: 'Workshop Sukosari (PT Rekaindo Global Jasa)' },
  'Remul': { lat: -7.6101753, lng: 111.5490581, label: 'Workshop Remul (Gudang PT Rekaindo Global Jasa)' },
  'Rejomulyo': { lat: -7.6101753, lng: 111.5490581, label: 'Workshop Rejomulyo (Gudang PT Rekaindo Global Jasa)' }
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
    throw new Error('Geolocation tidak didukung pada browser ini.')
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
        // Fallback gracefully rather than hard blocking
        resolve(null)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
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
    accuracy: coords.accuracy,
    speedKmh: coords.speedKmh,
    heading: coords.heading,
    lastUpdated: new Date().toISOString()
  }

  try {
    const url = `${baseUrl.replace(/\/+$/, '')}/active_tracking/${safeKpmKey}.json`
    const resp = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (resp.ok) {
      trackingState.lastPingSuccess = true
      trackingState.lastUpdated = new Date().toLocaleTimeString()
    } else {
      trackingState.lastPingSuccess = false
    }
  } catch (err) {
    console.warn('[Firebase Tracking Ping Error]', err)
    trackingState.lastPingSuccess = false
  }
}

/**
 * Starts continuous GPS tracking stream for active shipments
 */
export function startLiveTracking(deliveriesList = [], driverName = '') {
  if (!navigator.geolocation) {
    trackingState.errorMessage = 'Geolocation tidak tersedia pada browser ini.'
    return
  }

  activeDeliveries = deliveriesList.filter(d => d.status === 'Jalan' || d.currentStatus === 'Jalan')
  activeDriverName = driverName || 'DRIVER'
  trackingState.activeKpmCount = activeDeliveries.length

  if (activeDeliveries.length === 0) {
    stopLiveTracking()
    return
  }

  if (watchId !== null) return // Already running

  trackingState.isTracking = true
  trackingState.errorMessage = ''

  watchId = navigator.geolocation.watchPosition(
    async (pos) => {
      const now = Date.now()
      const coords = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: Math.round(pos.coords.accuracy || 0),
        speedKmh: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0,
        heading: pos.coords.heading ? Math.round(pos.coords.heading) : null,
        timestamp: now
      }

      trackingState.latitude = coords.latitude
      trackingState.longitude = coords.longitude
      trackingState.accuracy = coords.accuracy
      trackingState.speedKmh = coords.speedKmh
      trackingState.heading = coords.heading

      // Throttle network writes to Firebase
      if (now - lastSentTime >= PING_INTERVAL_MS) {
        lastSentTime = now
        for (const item of activeDeliveries) {
          await syncToFirebase(coords, item, activeDriverName)
        }
      }
    },
    (err) => {
      console.warn('[GPS Watcher Error]', err)
      trackingState.errorMessage = err.message || 'Gagal memantau GPS'
    },
    {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 15000
    }
  )
}

/**
 * Stops live tracking and removes watch listener
 */
export function stopLiveTracking() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId)
    watchId = null
  }
  trackingState.isTracking = false
}

/**
 * Removes completed shipment node from Firebase
 */
export async function removeActiveTrip(kpmId) {
  const baseUrl = getFirebaseDbUrl()
  if (!baseUrl || !kpmId) return

  const safeKpmKey = String(kpmId).replace(/[\/\\.#$\[\]]/g, '_')
  try {
    const url = `${baseUrl.replace(/\/+$/, '')}/active_tracking/${safeKpmKey}.json`
    await fetch(url, { method: 'DELETE' })
  } catch (err) {
    console.warn('[Firebase Remove Trip Error]', err)
  }
}

/**
 * Opens Google Maps Navigation to workshop destination in new tab
 */
export function openWorkshopNavigation(destinationName) {
  const ws = WORKSHOP_COORDINATES[destinationName]
  let url = ''

  if (ws && ws.lat && ws.lng) {
    url = `https://www.google.com/maps/dir/?api=1&destination=${ws.lat},${ws.lng}&travelmode=driving`
  } else if (destinationName) {
    url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destinationName + ', Madiun')}&travelmode=driving`
  }

  if (url) {
    window.open(url, '_blank')
  }
}
