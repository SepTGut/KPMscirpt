/**
 * Lightweight Driver API Client
 */
const API_URL = '/api'

export async function getDriverDeliveries() {
  const res = await fetch(`${API_URL}?action=getDeliveries&role=user&_t=${Date.now()}`)
  if (!res.ok) throw new Error('Gagal terhubung ke server (HTTP ' + res.status + ').')
  const json = await res.json()
  if (!json.success) throw new Error(json.error?.message || 'Gagal memuat tugas pengiriman.')
  return json.data || []
}

export async function sendStatusUpdate(payload) {
  const form = new URLSearchParams()
  form.set('action', 'updateStatus')
  form.set('role', 'user')
  form.set('nomorKPM', payload.nomorKPM)
  form.set('statusKPM', payload.statusKPM)
  form.set('fotoData', payload.fotoData)
  if (payload.namaPIC) form.set('namaPIC', payload.namaPIC)
  if (payload.lokasiWorkshop) form.set('lokasiWorkshop', payload.lokasiWorkshop)

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString()
  })

  if (!res.ok) throw new Error('Gagal mengirim data (HTTP ' + res.status + ').')
  const json = await res.json()
  if (!json.success) throw new Error(json.error?.message || 'Gagal memperbarui status KPM.')
  return json.data
}
