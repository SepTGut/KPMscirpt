/**
 * Direct Google Apps Script (GAS) API Client for Driver Mobile App
 * Supports both Native Android (CapacitorHttp) and Web (fetch)
 */
import { Capacitor, CapacitorHttp } from '@capacitor/core'

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

export function normalizeDelivery(d) {
  const status = d.status || d.currentStatus || (d.statusCode === 'BERANGKAT' ? 'Jalan' : 'Belum Berangkat')
  const lokasiParts = d.lokasi ? String(d.lokasi).split('➔') : []
  const wsAwal = d.wsAwal || d.lokasiBerangkat || (lokasiParts[0] ? lokasiParts[0].trim() : '-')
  const wsTujuan = d.wsTujuan || d.lokasiTiba || (lokasiParts[1] ? lokasiParts[1].trim() : '-')
  const items = d.daftarBarang || d.items || []

  return {
    ...d,
    nomor: d.nomor || d.kpmId || '-',
    kpmId: d.kpmId || d.nomor || '-',
    proyek: d.proyek || 'Line Feeding',
    status: status,
    currentStatus: status,
    wsAwal: wsAwal,
    wsTujuan: wsTujuan,
    lokasiBerangkat: wsAwal,
    lokasiTiba: wsTujuan,
    daftarBarang: items,
    items: items,
    pic: d.pic || '-',
    waktuBerangkat: d.waktuBerangkat || ''
  }
}

function parseGasResponse(data) {
  if (typeof data === 'object' && data !== null) {
    return data
  }
  if (typeof data === 'string') {
    const trimmed = data.trim()
    if (trimmed.startsWith('<!doctype') || trimmed.startsWith('<html') || trimmed.includes('accounts.google.com') || trimmed.includes('Sign in')) {
      throw new Error("Akses ditolak: Google Apps Script meminta login Google. Harap atur izin di script.google.com > Deploy > Manage deployments > 'Who has access: Anyone'.")
    }
    try {
      return JSON.parse(trimmed)
    } catch (parseErr) {
      throw new Error(`Respon server tidak valid (${trimmed.substring(0, 60)}...)`)
    }
  }
  throw new Error('Respon dari server kosong atau tidak valid.')
}

/**
 * Loads delivery assignments directly from Google Apps Script
 */
export async function getDriverDeliveries() {
  const gasUrl = getActiveGasUrl()
  const token = getActiveDriverToken()

  const url = `${gasUrl}?action=getDeliveries&apiToken=${encodeURIComponent(token)}&_t=${Date.now()}`

  try {
    let json

    if (Capacitor.isNativePlatform()) {
      // Native Android OS-level HTTP request (bypasses browser CORS & Webview restrictions)
      const res = await CapacitorHttp.get({
        url: url,
        headers: { 'Accept': 'application/json' },
        connectTimeout: 15000,
        readTimeout: 20000
      })

      if (res.status < 200 || res.status >= 400) {
        throw new Error(`Google Apps Script mengembalikan HTTP ${res.status}.`)
      }

      json = parseGasResponse(res.data)
    } else {
      // Browser / Dev fallback
      const res = await fetch(url, {
        method: 'GET',
        redirect: 'follow'
      })

      if (!res.ok) {
        throw new Error(`Google Apps Script mengembalikan error (HTTP ${res.status}).`)
      }

      const text = await res.text()
      json = parseGasResponse(text)
    }

    if (json && json.success) {
      const raw = Array.isArray(json.data) ? json.data : []
      return raw.map(normalizeDelivery)
    }

    throw new Error(json?.error?.message || 'Gagal memuat tugas pengiriman dari Google Apps Script.')
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
  if (payload.namaPIC && payload.namaPIC.trim() && payload.namaPIC !== 'DRIVER') {
    form.set('namaPIC', payload.namaPIC.trim())
  }
  if (payload.lokasiWorkshop) form.set('lokasiWorkshop', payload.lokasiWorkshop)

  try {
    let json

    if (Capacitor.isNativePlatform()) {
      // Native Android OS-level HTTP request
      const res = await CapacitorHttp.post({
        url: gasUrl,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        data: form.toString(),
        connectTimeout: 20000,
        readTimeout: 30000
      })

      if (res.status < 200 || res.status >= 400) {
        throw new Error(`Gagal mengirim data ke Google Apps Script (HTTP ${res.status}).`)
      }

      json = parseGasResponse(res.data)
    } else {
      // Browser fallback
      const res = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
        redirect: 'follow'
      })

      if (!res.ok) {
        throw new Error(`Gagal mengirim data ke Google Apps Script (HTTP ${res.status}).`)
      }

      const text = await res.text()
      json = parseGasResponse(text)
    }

    if (json && json.success) {
      return json.data
    }

    throw new Error(json?.error?.message || 'Google Apps Script menolak pembaruan status.')
  } catch (err) {
    console.error('[GAS Update Error]', err)
    throw new Error(err.message || 'Gagal mengirim update status ke Google Apps Script.')
  }
}
