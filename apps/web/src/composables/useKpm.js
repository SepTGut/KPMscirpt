import { ref, computed, watch } from 'vue'
import { requestApi } from './useApi'
import { useAuth } from './useAuth'
import { useGps } from './useGps'

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

// Editing modal state
const editingKpm = ref(null)
const editItemsList = ref([])

export function useKpm() {
  const { currentUser, mode, driverName } = useAuth()
  const { getCurrentCoordinates, startLiveTracking, removeActiveTrip, compressImage } = useGps()

  const filteredMonitoring = computed(() => {
    if (filter.value === 'Semua') {
      return monitoring.value.filter(item => item.status !== 'Selesai')
    }
    if (filter.value === 'Selesai') {
      return monitoring.value.filter(item => item.status === 'Selesai')
    }
    return monitoring.value.filter(item => item.status === filter.value)
  })

  function clearNotice() {
    message.value = ''
    error.value = ''
  }

  async function api(action, options = {}) {
    return requestApi(action, options, { currentUser: currentUser.value, mode: mode.value })
  }

  async function loadMaster() {
    if (mode.value !== 'admin') return
    try {
      if (typeof sessionStorage !== 'undefined') {
        const cached = sessionStorage.getItem('kpm_master_data')
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
          sessionStorage.setItem('kpm_master_data', JSON.stringify(data))
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
      const data = await api('createKpm', {
        body: {
          namaPIC: formData.namaPIC,
          namaProyek: formData.namaProyek,
          lokasiBerangkat: formData.lokasiBerangkat,
          lokasiTiba: formData.lokasiTiba,
          daftarBarang: JSON.stringify(formData.items),
        },
      })
      message.value = `KPM ${data?.nomor || data?.kpmId || ''} berhasil dibuat.`
    } catch (e) {
      error.value = e.message
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
      message.value = 'KPM berhasil diarsipkan.'
      await loadMonitoring(true, true)
    } catch (e) {
      error.value = e.message
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
      await loadMonitoring(true)
    } catch (e) {
      item.status = prevStatus
      selectEl.value = prevStatus
      error.value = e.message
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
    if (!payload.photoFile) {
      error.value = 'Foto bukti wajib dilampirkan.'
      return
    }
    busy.value = true
    try {
      if (driverName.value) {
        localStorage.setItem('kpm_driver_name', driverName.value)
      }

      const coords = await getCurrentCoordinates().catch(() => null)
      const fotoData = await compressImage(payload.photoFile)
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
    if (!payload.photoFile) {
      error.value = 'Foto bukti kedatangan wajib dilampirkan.'
      return null
    }
    busy.value = true
    try {
      if (driverName.value) {
        localStorage.setItem('kpm_driver_name', driverName.value)
      }
      const coords = await getCurrentCoordinates().catch(() => null)
      const fotoData = await compressImage(payload.photoFile)
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
    handleConfirmArrival
  }
}
