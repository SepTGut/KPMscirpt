/**
 * Direct Google Apps Script (GAS) API Client for Driver Mobile App
 * Direct connection without intermediary web proxy
 */

const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbxXRRDoiIXVt8VwUa7Gq-ZUdEP4YZhHiMoTdPKnSZ4eWMNBclUmQ5d86Zqoaxo76OM1jg/exec'
const DEFAULT_DRIVER_TOKEN = 'A9vX3kP7mQ2rT8zL5nC1wH6dF4sJ9yB7uG2eR8xN5pK3'

export function getActiveGasUrl() {
  return localStorage.getItem('kpm_gas_url') || DEFAULT_GAS_URL
}

export function getActiveDriverToken() {
  return localStorage.getItem('kpm_driver_token') || DEFAULT_DRIVER_TOKEN
}

export function setCustomConfig(gasUrl, driverToken) {
  if (gasUrl && gasUrl.trim()) {
    localStorage.setItem('kpm_gas_url', gasUrl.trim())
  } else {
    localStorage.removeItem('kpm_gas_url')
  }

  if (driverToken && driverToken.trim()) {
    localStorage.setItem('kpm_driver_token', driverToken.trim())
  } else {
    localStorage.removeItem('kpm_driver_token')
  }
}

/**
 * Loads delivery assignments directly from Google Apps Script
 */
export async function getDriverDeliveries() {
  const gasUrl = getActiveGasUrl()
  const token = getActiveDriverToken()

  const url = `${gasUrl}?action=getDeliveries&apiToken=${encodeURIComponent(token)}&_t=${Date.now()}`

  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow'
    })

    if (!res.ok) {
      throw new Error(`Google Apps Script mengembalikan error (HTTP ${res.status}).`)
    }

    const json = await res.json()
    if (json.success) {
      return json.data || []
    }
    throw new Error(json.error?.message || 'Gagal memuat tugas pengiriman dari Google Apps Script.')
  } catch (err) {
    console.error('[GAS Direct API Error]', err)
    throw new Error(err.message || 'Gagal terhubung langsung ke Google Apps Script.')
  }
}

/**
 * Sends status update and compressed photo directly to Google Apps Script
 */
export async function sendStatusUpdate(payload) {
  const gasUrl = getActiveGasUrl()
  const token = getActiveDriverToken()

  const form = new URLSearchParams()
  form.set('action', 'updateStatus')
  form.set('apiToken', token)
  form.set('nomorKPM', payload.nomorKPM)
  form.set('statusKPM', payload.statusKPM)
  form.set('fotoData', payload.fotoData)
  if (payload.namaPIC) form.set('namaPIC', payload.namaPIC)
  if (payload.lokasiWorkshop) form.set('lokasiWorkshop', payload.lokasiWorkshop)

  try {
    const res = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
      redirect: 'follow'
    })

    if (!res.ok) {
      throw new Error(`Gagal mengirim data ke Google Apps Script (HTTP ${res.status}).`)
    }

    const json = await res.json()
    if (json.success) {
      return json.data
    }
    throw new Error(json.error?.message || 'Google Apps Script menolak pembaruan status.')
  } catch (err) {
    console.error('[GAS Update Error]', err)
    throw new Error(err.message || 'Gagal mengirim update status ke Google Apps Script.')
  }
}


