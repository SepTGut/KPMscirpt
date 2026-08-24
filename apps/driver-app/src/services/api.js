/**
 * Driver API Service
 */
import { enqueueUpdate, getPendingUpdates, removePendingUpdate } from './offlineQueue'
import { playBeep, triggerVibration } from './feedback'

const API_BASE = '/api'

export async function fetchDeliveries(bypassCache = false) {
  const url = `${API_BASE}?action=getDeliveries&role=user${bypassCache ? '&bypassCache=true' : ''}`
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' }
  })
  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}: Gagal memuat data pengiriman.`)
  }
  const result = await response.json()
  if (!result.success) {
    throw new Error(result.error?.message || 'Gagal memuat data KPM.')
  }
  return result.data || []
}

export async function submitStatusUpdate(params) {
  // If browser is offline, enqueue directly
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    await enqueueUpdate(params)
    triggerVibration([100, 50, 100])
    playBeep('scan')
    return {
      success: true,
      offlineQueued: true,
      message: 'Koneksi offline. Update status disimpan di HP dan akan diunggah otomatis saat online.'
    }
  }

  try {
    const formData = new URLSearchParams()
    formData.set('action', 'updateStatus')
    formData.set('role', 'user')
    formData.set('nomorKPM', params.nomorKPM)
    formData.set('statusKPM', params.statusKPM)
    if (params.fotoData) formData.set('fotoData', params.fotoData)
    if (params.namaPIC) formData.set('namaPIC', params.namaPIC)
    if (params.lokasiWorkshop) formData.set('lokasiWorkshop', params.lokasiWorkshop)

    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: formData.toString()
    })

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error?.message || 'Gagal memperbarui status KPM.')
    }

    triggerVibration([50, 50, 100])
    playBeep('success')
    return result.data
  } catch (error) {
    // Network failure during fetch -> fallback to offline queue
    if (error.name === 'TypeError' || error.message.includes('fetch') || !navigator.onLine) {
      await enqueueUpdate(params)
      triggerVibration([100, 50, 100])
      playBeep('scan')
      return {
        success: true,
        offlineQueued: true,
        message: 'Koneksi terputus. Update status disimpan di antrean HP dan akan di-sync otomatis.'
      }
    }
    triggerVibration([200, 100, 200])
    playBeep('error')
    throw error
  }
}

/**
 * Flushes pending offline updates when connection is restored
 */
export async function syncOfflineQueue(onProgress) {
  const pending = await getPendingUpdates()
  if (!pending.length) return { synced: 0, failed: 0 }

  let synced = 0
  let failed = 0

  for (const item of pending) {
    try {
      if (onProgress) onProgress({ current: item, remaining: pending.length - synced })
      const formData = new URLSearchParams()
      formData.set('action', 'updateStatus')
      formData.set('role', 'user')
      formData.set('nomorKPM', item.nomorKPM)
      formData.set('statusKPM', item.statusKPM)
      if (item.fotoData) formData.set('fotoData', item.fotoData)
      if (item.namaPIC) formData.set('namaPIC', item.namaPIC)
      if (item.lokasiWorkshop) formData.set('lokasiWorkshop', item.lokasiWorkshop)

      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: formData.toString()
      })
      const result = await response.json()
      if (result.success) {
        await removePendingUpdate(item.id)
        synced++
      } else {
        failed++
      }
    } catch (e) {
      failed++
      break // Stop sync if network dropped again
    }
  }

  if (synced > 0) {
    triggerVibration([100, 100, 150])
    playBeep('success')
  }

  return { synced, failed }
}
