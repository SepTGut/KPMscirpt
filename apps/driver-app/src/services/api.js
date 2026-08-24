/**
 * Universal Driver API Client with Multi-Endpoint Fallback
 */

const ENDPOINTS = [
  'https://combined-app-theta.vercel.app/api',
  'https://combined-app-samudroguntur06-2380s-projects.vercel.app/api'
]

export function getActiveServerUrl() {
  const custom = localStorage.getItem('kpm_server_url')
  return custom ? custom.trim().replace(/\/+$/, '') : ENDPOINTS[0]
}

export function setCustomServerUrl(url) {
  if (url && url.trim()) {
    localStorage.setItem('kpm_server_url', url.trim().replace(/\/+$/, ''))
  } else {
    localStorage.removeItem('kpm_server_url')
  }
}

async function tryFetchJson(url, options = {}) {
  const res = await fetch(url, options)
  
  // Detect Vercel Deployment Protection / SSO redirect
  if (res.status === 302 || res.redirected || (res.headers.get('content-type') && !res.headers.get('content-type').includes('application/json'))) {
    const text = await res.text()
    if (text.includes('Log in to Vercel') || text.includes('sso-api') || text.includes('Protected Deployment')) {
      throw new Error('Vercel Deployment Protection aktif. Harap nonaktifkan Vercel Authentication di dashboard Vercel.')
    }
  }

  if (!res.ok) {
    throw new Error(`Server mengembalikan error (HTTP ${res.status}).`)
  }

  const json = await res.json()
  return json
}

export async function getDriverDeliveries() {
  const customUrl = localStorage.getItem('kpm_server_url')
  const candidateUrls = customUrl
    ? [customUrl.trim().replace(/\/+$/, ''), ...ENDPOINTS]
    : ENDPOINTS

  let lastError = null

  for (const baseUrl of candidateUrls) {
    try {
      const url = `${baseUrl}?action=getDeliveries&role=user&_t=${Date.now()}`
      const json = await tryFetchJson(url)
      if (json.success) {
        return json.data || []
      }
      throw new Error(json.error?.message || 'Gagal memuat tugas pengiriman.')
    } catch (err) {
      lastError = err
      console.warn(`[KPM API] Failed on ${baseUrl}:`, err.message)
    }
  }

  throw lastError || new Error('Gagal terhubung ke server KPM.')
}

export async function sendStatusUpdate(payload) {
  const customUrl = localStorage.getItem('kpm_server_url')
  const candidateUrls = customUrl
    ? [customUrl.trim().replace(/\/+$/, ''), ...ENDPOINTS]
    : ENDPOINTS

  const form = new URLSearchParams()
  form.set('action', 'updateStatus')
  form.set('role', 'user')
  form.set('nomorKPM', payload.nomorKPM)
  form.set('statusKPM', payload.statusKPM)
  form.set('fotoData', payload.fotoData)
  if (payload.namaPIC) form.set('namaPIC', payload.namaPIC)
  if (payload.lokasiWorkshop) form.set('lokasiWorkshop', payload.lokasiWorkshop)

  let lastError = null

  for (const baseUrl of candidateUrls) {
    try {
      const json = await tryFetchJson(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString()
      })
      if (json.success) {
        return json.data
      }
      throw new Error(json.error?.message || 'Gagal memperbarui status KPM.')
    } catch (err) {
      lastError = err
      console.warn(`[KPM API] Failed POST on ${baseUrl}:`, err.message)
    }
  }

  throw lastError || new Error('Gagal mengirim data update status.')
}

