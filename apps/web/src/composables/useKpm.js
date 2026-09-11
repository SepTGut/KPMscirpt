import { ref, computed, watch, onMounted } from 'vue'
import { requestApi } from './useApi'
import { useAuth } from './useAuth'
import { useGps } from './useGps'
import { useToast } from './useToast'

// Shared singleton reactive KPM state
const master = ref({ workshops: [], pics: [], uoms: [] })
const monitoring = ref([])
const deliveries = ref([])
const selectedDelivery = ref(null)
const filter = ref('Semua')
const archivedLoaded = ref(false)
const busy = ref(false)
const message = ref('')
const error = ref('')

// Smart Auto-Polling State
const isPollingActive = ref(true)
const pollingSecondsLeft = ref(25)
let pollingTimer = null

// Form Autosave Draft Key
const DRAFT_KEY = 'kpm_create_draft_v1'

// Formula Injection Defense
/**
 * Sanitizes input to prevent spreadsheet formula injection.
 * Prepends a single quote to strings that start with formula triggers.
 *
 * @param {string|any} str - Input string to sanitize
 * @returns {string|any} - Sanitized string or original value if not string
 *
 * @example
 * sanitizeSpreadsheetInput('=SUM(A1:A10)') // "'=SUM(A1:A10)"
 * sanitizeSpreadsheetInput('=IMPORTRANGE("...")') // "'=IMPORTRANGE("...")"
 * sanitizeSpreadsheetInput('＝EVIL') // "'＝EVIL" (fullwidth equals)
 * sanitizeSpreadsheetInput('Normal text') // "Normal text"
 * sanitizeSpreadsheetInput(123) // 123 (non-string passthrough)
 */
export function sanitizeSpreadsheetInput(str) {
  if (typeof str !== 'string') return str
  // Matches: = + - @ tab CR LF, fullwidth equals (＝ U+FF1D), = followed by alpha (formula start)
  if (/^[=+\-@\t\r＝]|^=[A-Za-z]/.test(str)) {
    return "'" + str
  }
  return str
}

// Editing modal state
const editingKpm = ref(null)
const editItemsList = ref([])

export function useKpm() {
  const { currentUser, mode, driverName } = useAuth()
  const { getCurrentCoordinates, startLiveTracking, removeActiveTrip, compressImage } = useGps()
  const toast = useToast()

  const isITUser = computed(() => {
    const r = (currentUser.value?.role || '').toLowerCase()
    return r === 'it' || currentUser.value?.isIT === true || currentUser.value?.username?.toUpperCase() === 'ST'
  })

  function isTestItem(item) {
    if (!item) return false
    if (item.isTest === true) return true
    const no = String(item.nomor || item.kpmId || '').toUpperCase()
    const o = String(item.lokasiBerangkat || item.lokasiAwal || '').trim()
    const d = String(item.lokasiTujuan || '').trim()
    const p = String(item.pic || '').trim().toUpperCase()
    const drv = String(item.driver || '').trim().toUpperCase()
    const r = String(item.penerima || '').trim().toUpperCase()
    return no.includes('TEST') || o === 'Test0' || o === 'Test1' || d === 'Test0' || d === 'Test1' || p === 'IT' || p === 'ST' || drv === 'IT' || drv === 'ST' || r === 'IT' || r === 'ST'
  }

  const filteredMonitoring = computed(() => {
    let list = monitoring.value
    if (!isITUser.value) {
      list = list.filter(item => !isTestItem(item))
    }
    if (filter.value === 'Semua') {
      return list.filter(item => item.status !== 'Selesai')
    }
    if (filter.value === 'Selesai') {
      return list.filter(item => item.status === 'Selesai')
    }
    return list.filter(item => item.status === filter.value)
  })

  // Real-time KPI Metric Summaries
  const kpiStats = computed(() => {
    const list = isITUser.value ? monitoring.value : (monitoring.value || []).filter(item => !isTestItem(item))
    let totalActive = 0
    let inTransit = 0
    let pendingGate = 0
    let completed = 0

    for (const item of list) {
      const s = String(item.status || '').trim()
      if (s === 'Jalan') {
        inTransit++
      } else if (s === 'Baru Dibuat' || s === 'Belum Berangkat' || s === 'Menunggu Verifikasi Gerbang') {
        pendingGate++
      } else if (s === 'Tiba' || s === 'Selesai') {
        completed++
      }

      if (s !== 'Selesai' && s !== 'ARCHIVED') {
        totalActive++
      }
    }

    return {
      totalActive,
      inTransit,
      pendingGate,
      completed
    }
  })

  // Form Autosave Draft Guard
  function saveDraft(formData) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(formData))
      }
    } catch {}
  }

  function loadDraft() {
    try {
      if (typeof localStorage !== 'undefined') {
        const data = localStorage.getItem(DRAFT_KEY)
        return data ? JSON.parse(data) : null
      }
    } catch {}
    return null
  }

  function clearDraft() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(DRAFT_KEY)
      }
    } catch {}
  }

  // Smart Auto-Polling Controller
  function startPollingTimer() {
    if (pollingTimer) clearInterval(pollingTimer)
    pollingTimer = setInterval(() => {
      if (!isPollingActive.value || busy.value) return
      if (pollingSecondsLeft.value > 1) {
        pollingSecondsLeft.value--
      } else {
        pollingSecondsLeft.value = 25
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          if (mode.value === 'admin') {
            loadMonitoring(true)
          } else {
            loadDeliveries(true)
          }
        }
      }
    }, 1000)
  }

  function togglePolling() {
    isPollingActive.value = !isPollingActive.value
    if (isPollingActive.value) {
      pollingSecondsLeft.value = 25
    }
  }

  onMounted(() => {
    if (!pollingTimer) {
      startPollingTimer()
    }
  })

  function clearNotice() {
    message.value = ''
    error.value = ''
  }

  async function api(action, options = {}) {
    return requestApi(action, options, { currentUser: currentUser.value, mode: mode.value })
  }

  async function cleanOrphanedAndTestRows() {
    clearNotice()
    busy.value = true
    try {
      const res = await api('cleanOrphanedAndTestRows', { method: 'POST' })
      message.value = res?.message || 'Pembersihan data testing dan baris kosong berhasil diselesaikan.'
      await loadMonitoring(true)
      return res
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      busy.value = false
    }
  }

  async function loadMaster(forceRefresh = false) {
    if (mode.value !== 'admin') return
    try {
      const cacheKey = isITUser.value ? 'kpm_master_data_it' : 'kpm_master_data_prod'
      if (!forceRefresh && typeof sessionStorage !== 'undefined') {
        const cached = sessionStorage.getItem(cacheKey)
        if (cached) {
          try {
            const parsed = JSON.parse(cached)
            if (parsed && parsed.workshops?.length) {
              master.value = parsed
            }
          } catch {}
        }
      }
      const data = await api('getMasterData', { method: 'GET' })
      if (data) {
        master.value = data
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem(cacheKey, JSON.stringify(data))
        }
      }
    } catch (e) {
      error.value = e.message
    }
  }

  async function loadMonitoring(forceRefresh = false, fetchArchived = false) {
    clearNotice()
    busy.value = true
    const includeArchived = fetchArchived || filter.value === 'Selesai'
    try {
      const body = {
        includeArchived: includeArchived ? 'true' : 'false',
        ...(forceRefresh ? { refresh: 'true' } : {})
      }
      monitoring.value = (await api('getMonitoring', { method: 'GET', body })) || []
      if (includeArchived) {
        archivedLoaded.value = true
      }
    } catch (e) {
      error.value = e.message
    } finally {
      busy.value = false
    }
  }

  watch(filter, (newFilter) => {
    if (newFilter === 'Selesai' && !archivedLoaded.value) {
      loadMonitoring(false, true)
    }
  })

  async function loadDeliveries(forceRefresh = false) {
    clearNotice()
    busy.value = true
    selectedDelivery.value = null
    try {
      const body = forceRefresh ? { refresh: 'true' } : {}
      deliveries.value = (await api('getDeliveries', { method: 'GET', body })) || []
      startLiveTracking(deliveries.value, driverName.value)
    } catch (e) {
      error.value = e.message
    } finally {
      busy.value = false
    }
  }

  async function handleCreateKpm(formData) {
    clearNotice()
    busy.value = true
    try {
      // Input validation - max lengths
      const namaPIC = String(formData.namaPIC || '').trim()
      const namaProyek = String(formData.namaProyek || '').trim()
      const lokasiBerangkat = String(formData.lokasiBerangkat || '').trim()
      const lokasiTiba = String(formData.lokasiTiba || '').trim()

      if (!namaPIC) throw new Error('Nama PIC wajib diisi.')
      if (namaPIC.length > 100) throw new Error('Nama PIC maksimal 100 karakter.')
      if (!namaProyek) throw new Error('Nama proyek wajib diisi.')
      if (namaProyek.length > 200) throw new Error('Nama proyek maksimal 200 karakter.')
      if (!lokasiBerangkat) throw new Error('Lokasi berangkat wajib diisi.')
      if (lokasiBerangkat.length > 100) throw new Error('Lokasi berangkat maksimal 100 karakter.')
      if (!lokasiTiba) throw new Error('Lokasi tujuan wajib diisi.')
      if (lokasiTiba.length > 100) throw new Error('Lokasi tujuan maksimal 100 karakter.')

      const items = formData.items || []
      if (!items.length) throw new Error('Minimal 1 material barang wajib diisi.')
      if (items.length > 100) throw new Error('Maksimal 100 item material.')

      for (const it of items) {
        const nama = String(it.namaBarang || '').trim()
        if (!nama) throw new Error('Semua material harus memiliki nama.')
        if (nama.length > 200) throw new Error('Nama material maksimal 200 karakter.')
        const qty = String(it.qty || '').trim()
        if (!/^\d+(\.\d+)?$/.test(qty) || Number(qty) <= 0) {
          throw new Error(`Kuantitas untuk material '${nama}' harus angka positif.`)
        }
      }

      // Formula Injection Defense
      const sanitizedItems = items.map(it => ({
        kodeBarang: sanitizeSpreadsheetInput(String(it.kodeBarang || '')),
        namaBarang: sanitizeSpreadsheetInput(String(it.namaBarang || '')),
        qty: String(it.qty || ''),
        uom: sanitizeSpreadsheetInput(String(it.uom || ''))
      }))

      const data = await api('createKpm', {
        body: {
          namaPIC: sanitizeSpreadsheetInput(namaPIC),
          namaProyek: sanitizeSpreadsheetInput(namaProyek),
          lokasiBerangkat: sanitizeSpreadsheetInput(lokasiBerangkat),
          lokasiTiba: sanitizeSpreadsheetInput(lokasiTiba),
          daftarBarang: JSON.stringify(sanitizedItems),
        },
      })
      const noKpm = data?.nomor || data?.kpmId || ''
      message.value = `KPM ${noKpm} berhasil dibuat.`
      toast.success(`KPM ${noKpm} berhasil dibuat dan diterbitkan.`)
      clearDraft()
      return data
    } catch (e) {
      error.value = e.message
      toast.error(e.message, 'Gagal Membuat KPM')
      throw e
    } finally {
      busy.value = false
    }
  }

  async function handleArchiveKpm(item) {
    if (!confirm(`Sembunyikan KPM ${item.nomor} dari pantauan?`)) return
    clearNotice()
    busy.value = true
    try {
      await api('archiveKpm', { body: { nomorKPM: item.nomor, statusKPM: 'Selesai' } })
      message.value = `KPM ${item.nomor} berhasil diarsipkan.`
      toast.success(`KPM ${item.nomor} berhasil diarsipkan.`)
      await loadMonitoring(true, true)
    } catch (e) {
      error.value = e.message
      toast.error(e.message, 'Gagal Mengarsipkan KPM')
    } finally {
      busy.value = false
    }
  }

  async function handleAdminChangeStatus(item, event) {
    const selectEl = event.target
    const newStatus = selectEl.value
    if (!newStatus || item.status === newStatus) return
    if (!confirm(`Ubah status KPM ${item.nomor} dari '${item.status}' menjadi '${newStatus}'?`)) {
      selectEl.value = item.status
      return
    }
    const prevStatus = item.status
    item.status = newStatus
    clearNotice()
    busy.value = true
    try {
      await api('adminUpdateStatus', {
        body: { nomorKPM: item.nomor, statusKPM: newStatus }
      })
      message.value = `Status KPM ${item.nomor} berhasil diubah menjadi '${newStatus}'.`
      toast.success(`Status KPM ${item.nomor} diubah ke '${newStatus}'.`)
      await loadMonitoring(true)
    } catch (e) {
      item.status = prevStatus
      selectEl.value = prevStatus
      error.value = e.message
      toast.error(e.message, 'Gagal Mengubah Status')
    } finally {
      busy.value = false
    }
  }

  function startEditLatestKpm(item) {
    if (item.status !== 'Baru Dibuat' && item.status !== 'Belum Berangkat') {
      error.value = `Material tidak dapat diubah karena KPM ${item.nomor} sudah berstatus '${item.status}'. Penambahan atau pengurangan material hanya diizinkan saat KPM masih 'Belum Berangkat'.`
      return
    }
    editingKpm.value = item
    editItemsList.value = (item.daftarBarang || []).map(b => ({
      nama: b.nama || '',
      qty: b.qty || 1,
      uom: b.uom || 'PCS'
    }))
    if (editItemsList.value.length === 0) {
      editItemsList.value.push({ nama: '', qty: 1, uom: master.value.uoms[0] || 'PCS' })
    }
  }

  function addEditItem() {
    editItemsList.value.push({ nama: '', qty: 1, uom: master.value.uoms[0] || 'PCS' })
  }

  function removeEditItem(index) {
    if (editItemsList.value.length > 1) {
      editItemsList.value.splice(index, 1)
    }
  }

  async function saveLatestKpmItems() {
    if (!editingKpm.value) return
    if (editItemsList.value.some(i => !i.nama?.trim() || Number(i.qty) <= 0)) {
      error.value = 'Semua material harus memiliki nama dan kuantitas positif.'
      return
    }
    const kpmNomor = editingKpm.value.nomor
    const itemsPayload = JSON.stringify(editItemsList.value)
    editingKpm.value = null
    clearNotice()
    busy.value = true
    try {
      const res = await api('editLatestKpmItems', {
        body: {
          nomorKPM: kpmNomor,
          daftarBarang: itemsPayload
        }
      })
      message.value = res?.message || `Material KPM ${kpmNomor} berhasil diperbarui.`
      await loadMonitoring(true)
    } catch (e) {
      error.value = e.message
    } finally {
      busy.value = false
    }
  }

  async function handleDriverStatusUpdate(payload) {
    clearNotice()
    if (!selectedDelivery.value || !payload.statusKPM) {
      error.value = 'Pilih KPM dan status terlebih dahulu.'
      return
    }
    busy.value = true
    try {
      if (driverName.value) {
        localStorage.setItem('kpm_driver_name', driverName.value)
      }
      const coords = await getCurrentCoordinates().catch(() => null)
      let fotoData = ''
      if (payload.photoFile) {
        try {
          fotoData = await compressImage(payload.photoFile)
        } catch (err) {
          console.warn('Gagal kompres foto:', err)
        }
      }
      const kpmNomor = selectedDelivery.value.nomor || selectedDelivery.value.kpmId

      await api('updateStatus', {
        body: {
          nomorKPM: kpmNomor,
          statusKPM: payload.statusKPM,
          namaPIC: selectedDelivery.value.pic,
          driver: driverName.value || '',
          lokasiWorkshop: payload.statusKPM === 'Tiba'
            ? (selectedDelivery.value.lokasiTiba || selectedDelivery.value.lokasi)
            : (selectedDelivery.value.lokasiBerangkat || selectedDelivery.value.lokasi),
          fotoData: fotoData,
          latitude: coords?.latitude || '',
          longitude: coords?.longitude || '',
        },
      })

      if (payload.statusKPM === 'Tiba') {
        await removeActiveTrip(kpmNomor)
      }

      message.value = 'Status KPM & Koordinat GPS berhasil diperbarui.'
      await loadDeliveries()
      startLiveTracking(deliveries.value, driverName.value)
    } catch (e) {
      error.value = e.message
    } finally {
      busy.value = false
    }
  }

  async function handleStageArrival(payload) {
    clearNotice()
    if (!payload.kpmNomor) {
      error.value = 'Pilih KPM terlebih dahulu.'
      return null
    }
    busy.value = true
    try {
      if (driverName.value) {
        localStorage.setItem('kpm_driver_name', driverName.value)
      }
      const coords = await getCurrentCoordinates().catch(() => null)
      let fotoData = ''
      if (payload.photoFile) {
        try {
          fotoData = await compressImage(payload.photoFile)
        } catch (err) {
          console.warn('Gagal kompres foto:', err)
        }
      }
      const res = await api('stageArrival', {
        body: {
          nomorKPM: payload.kpmNomor,
          fotoData: fotoData,
          driver: driverName.value || payload.driver || '',
          namaPIC: payload.pic || '',
          lokasiWorkshop: payload.workshop || '',
          latitude: coords?.latitude || '',
          longitude: coords?.longitude || '',
        }
      })
      return res
    } catch (e) {
      error.value = e.message
      return null
    } finally {
      busy.value = false
    }
  }

  async function handleConfirmArrival(nomorKPM, namaPenerima) {
    clearNotice()
    if (!nomorKPM || !namaPenerima) {
      error.value = 'Nomor KPM dan nama penerima wajib diisi.'
      return null
    }
    busy.value = true
    try {
      const res = await api('confirmArrivalReceipt', {
        body: {
          nomorKPM: nomorKPM,
          namaPenerima: namaPenerima
        }
      })
      await removeActiveTrip(nomorKPM).catch(() => {})
      message.value = res?.message || `KPM ${nomorKPM} berhasil dikonfirmasi diterima oleh ${namaPenerima}.`
      return res
    } catch (e) {
      error.value = e.message
      return null
    } finally {
      busy.value = false
    }
  }

  return {
    master,
    monitoring,
    deliveries,
    selectedDelivery,
    filter,
    filteredMonitoring,
    busy,
    message,
    error,
    editingKpm,
    editItemsList,
    clearNotice,
    loadMaster,
    loadMonitoring,
    loadDeliveries,
    handleCreateKpm,
    handleArchiveKpm,
    handleAdminChangeStatus,
    startEditLatestKpm,
    addEditItem,
    removeEditItem,
    saveLatestKpmItems,
    handleDriverStatusUpdate,
    handleStageArrival,
    handleConfirmArrival,
    cleanOrphanedAndTestRows,
    kpiStats,
    saveDraft,
    loadDraft,
    clearDraft,
    isPollingActive,
    pollingSecondsLeft,
    togglePolling,
    startPollingTimer,
    sanitizeSpreadsheetInput
  }
}
