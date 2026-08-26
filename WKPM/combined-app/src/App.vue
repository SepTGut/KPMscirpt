<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import LoginScreen from './components/LoginScreen.vue'
import LiveTrackingMap from './components/LiveTrackingMap.vue'
import AdminCreatePanel from './components/AdminCreatePanel.vue'
import AdminMonitoringPanel from './components/AdminMonitoringPanel.vue'
import MaterialEditorModal from './components/MaterialEditorModal.vue'
import DriverDeliveryPanel from './components/DriverDeliveryPanel.vue'
import {
  getCurrentCoordinates,
  startLiveTracking,
  removeActiveTrip
} from './services/trackingService'

const scriptUrl = import.meta.env.VITE_API_URL || '/api'
const requestTimeout = 30000

// User Authentication Session State
const currentUser = ref(null)
const loginError = ref('')

function loadSavedSession() {
  const saved = localStorage.getItem('kpm_user_session') || sessionStorage.getItem('kpm_user_session')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      if (parsed && parsed.role) {
        currentUser.value = parsed
        mode.value = parsed.role === 'admin' ? 'admin' : 'user'
        if (parsed.role === 'user' && parsed.name) {
          driverName.value = parsed.name
        }
      }
    } catch {}
  }
}

const currentPath = window.location.pathname.replace(/\/+$/, '') || '/'
const mode = ref(currentPath.endsWith('/kpm/personel') ? 'user' : 'admin')
const adminView = ref('create')
const busy = ref(false)
const message = ref('')
const error = ref('')
const master = ref({ workshops: [], pics: [], uoms: [] })
const monitoring = ref([])
const deliveries = ref([])
const selectedDelivery = ref(null)
const filter = ref('Semua')
const driverName = ref(localStorage.getItem('kpm_driver_name') || '')
const archivedLoaded = ref(false)

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
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), requestTimeout)
  try {
    const params = new URLSearchParams(options.body || {})
    params.set('action', action)
    params.set('role', currentUser.value?.role || mode.value)
    if (currentUser.value?.token) {
      params.set('apiToken', currentUser.value.token)
    }
    const isGet = options.method === 'GET'
    const response = await fetch(isGet ? `${scriptUrl}?${params}` : scriptUrl, {
      method: options.method || 'POST',
      body: isGet ? undefined : params,
      cache: 'no-store',
      signal: controller.signal,
    })
    const result = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(result?.error?.message || `Server returned ${response.status}`)
    }
    if (!result?.success) {
      const detail = result?.error?.message || result?.error?.code
      throw new Error(detail || `API menolak permintaan: ${JSON.stringify(result)}`)
    }
    return result.data
  } finally {
    clearTimeout(timeout)
  }
}

// Authentication Handlers
async function handleLoginCredentials(payload) {
  loginError.value = ''
  busy.value = true
  try {
    const data = await api('login', {
      body: {
        username: payload.username,
        password: payload.password
      }
    })
    if (!data || !data.role) {
      throw new Error('Respons otentikasi tidak valid.')
    }
    currentUser.value = data
    mode.value = data.role === 'admin' ? 'admin' : 'user'
    if (data.role === 'user' && data.name) {
      driverName.value = data.name
      localStorage.setItem('kpm_driver_name', data.name)
    }
    const sessionStr = JSON.stringify(data)
    if (payload.rememberMe) {
      localStorage.setItem('kpm_user_session', sessionStr)
    } else {
      sessionStorage.setItem('kpm_user_session', sessionStr)
    }
    if (mode.value === 'admin') loadMaster()
    else loadDeliveries()
  } catch (e) {
    loginError.value = e.message
  } finally {
    busy.value = false
  }
}

async function handleLoginGoogle(payload) {
  loginError.value = ''
  busy.value = true
  try {
    const data = await api('login', {
      body: {
        googleEmail: payload.googleEmail
      }
    })
    if (!data || !data.role) {
      throw new Error('Akun Google tidak terdaftar di sistem pengguna.')
    }
    currentUser.value = data
    mode.value = data.role === 'admin' ? 'admin' : 'user'
    if (data.role === 'user' && data.name) {
      driverName.value = data.name
      localStorage.setItem('kpm_driver_name', data.name)
    }
    const sessionStr = JSON.stringify(data)
    if (payload.rememberMe) {
      localStorage.setItem('kpm_user_session', sessionStr)
    } else {
      sessionStorage.setItem('kpm_user_session', sessionStr)
    }
    if (mode.value === 'admin') loadMaster()
    else loadDeliveries()
  } catch (e) {
    loginError.value = e.message
  } finally {
    busy.value = false
  }
}

function handleLogout() {
  localStorage.removeItem('kpm_user_session')
  sessionStorage.removeItem('kpm_user_session')
  currentUser.value = null
  selectedDelivery.value = null
  monitoring.value = []
  deliveries.value = []
  clearNotice()
}

async function loadMaster() {
  if (mode.value !== 'admin') return
  try {
    const cached = sessionStorage.getItem('kpm_master_data')
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (parsed && parsed.workshops?.length) {
          master.value = parsed
        }
      } catch {}
    }
    const data = await api('getMasterData', { method: 'GET' })
    if (data) {
      master.value = data
      sessionStorage.setItem('kpm_master_data', JSON.stringify(data))
    }
  } catch (e) {
    error.value = e.message
  }
}

// Lazy loading: fetch active KPMs by default, fetch archived on demand
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

// Material Management Modal State & Handlers
const editingKpm = ref(null)
const editItemsList = ref([])

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

// Driver actions & photo compression
async function compressImage(file) {
  const MAX_WIDTH = 1000
  const JPEG_QUALITY = 0.72

  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_WIDTH / bitmap.width)
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))
    if (typeof OffscreenCanvas === 'function') {
      const oc = new OffscreenCanvas(w, h)
      const ctx = oc.getContext('2d')
      ctx.drawImage(bitmap, 0, 0, w, h)
      bitmap.close()
      const blob = await oc.convertToBlob({ type: 'image/jpeg', quality: JPEG_QUALITY })
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(new Error('Foto tidak dapat dibaca.'))
        reader.readAsDataURL(blob)
      })
    }
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close()
    return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Foto tidak dapat dibaca.'))
    reader.onload = event => {
      const image = new Image()
      image.onerror = () => reject(new Error('File bukan gambar yang valid.'))
      image.onload = () => {
        const scale = Math.min(1, MAX_WIDTH / image.width)
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(image.width * scale))
        canvas.height = Math.max(1, Math.round(image.height * scale))
        const context = canvas.getContext('2d')
        if (!context) return reject(new Error('Browser tidak mendukung pemrosesan foto.'))
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY))
      }
      image.src = event.target.result
    }
    reader.readAsDataURL(file)
  })
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

onMounted(() => {
  loadSavedSession()
  if (currentUser.value) {
    if (mode.value === 'admin') loadMaster()
    else loadDeliveries()
  }
})
</script>

<template>
  <!-- Login Screen if not authenticated -->
  <LoginScreen
    v-if="!currentUser"
    :busy="busy"
    :errorMessage="loginError"
    @login-credentials="handleLoginCredentials"
    @login-google="handleLoginGoogle"
  />

  <!-- Authenticated App View -->
  <div v-else class="min-h-screen bg-google-surface-50 font-sans">
    <!-- Google 4-Color Accent Top Bar -->
    <div class="google-bar"></div>

    <!-- Header (Google Workspace AppBar) -->
    <header class="border-b border-google-surface-300/70 bg-white/90 backdrop-blur-md sticky top-0 z-20 shadow-sm">
      <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-google-blue-600 via-indigo-500 to-google-green-500 flex items-center justify-center font-bold text-white shadow-md shadow-google-blue-500/20 ring-1 ring-white/30">
            LF
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-xl font-bold text-google-surface-800 leading-tight">KPM Line Feeding</h1>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-google-blue-50 text-google-blue-700 border border-google-blue-200">Unified</span>
            </div>
            <p class="text-xs text-google-surface-500 font-medium">Operations & Monitoring Platform</p>
          </div>
        </div>

        <div class="flex items-center gap-2.5">
          <!-- Active User Badge -->
          <div class="flex items-center gap-2 rounded-full bg-google-surface-100 py-1 pl-3 pr-1.5 border border-google-surface-300/70 text-xs shadow-inner">
            <span class="font-bold text-google-surface-800 flex items-center gap-1.5">
              <span>{{ currentUser.role === 'admin' ? '🛡️' : '🚚' }}</span>
              <span class="text-google-blue-700 font-semibold">{{ currentUser.name || currentUser.username }}</span>
              <span class="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200 uppercase">
                {{ currentUser.role }}
              </span>
            </span>

            <!-- Logout Button -->
            <button
              type="button"
              class="rounded-full bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 px-2.5 py-1 text-xs font-bold border border-slate-200 transition shadow-sm"
              @click="handleLogout"
              title="Keluar / Ganti Akun"
            >
              Keluar ➔
            </button>
          </div>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <!-- Notices -->
      <div v-if="error" class="mb-5 rounded-2xl border border-google-red-200 bg-google-red-50 px-4 py-3.5 text-sm font-semibold text-google-red-700 shadow-sm flex items-center justify-between animate-fadeIn">
        <div class="flex items-center gap-2">
          <span>⚠️</span>
          <span>{{ error }}</span>
        </div>
        <button @click="error = ''" class="text-google-red-700 hover:opacity-70 font-bold">✕</button>
      </div>

      <div v-if="message" class="mb-5 rounded-2xl border border-google-green-200 bg-google-green-50 px-4 py-3.5 text-sm font-semibold text-google-green-700 shadow-sm flex items-center justify-between animate-fadeIn">
        <div class="flex items-center gap-2">
          <span>✓</span>
          <span>{{ message }}</span>
        </div>
        <button @click="message = ''" class="text-google-green-700 hover:opacity-70 font-bold">✕</button>
      </div>

      <!-- ADMIN SECTION -->
      <section v-if="currentUser.role === 'admin'">
        <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 class="text-xl font-bold text-google-surface-800">Admin Dashboard</h2>
            <p class="text-xs text-google-surface-500 mt-0.5">Buat penugasan baru dan pantau pergerakan KPM secara real-time.</p>
          </div>

          <!-- M3 Segmented Navigation Tabs -->
          <div class="flex bg-google-surface-100 p-1 rounded-full border border-google-surface-300/70 shadow-sm flex-wrap gap-1">
            <button
              class="rounded-full px-4 py-2 text-xs font-bold transition-all duration-200"
              :class="adminView === 'create' ? 'bg-gradient-to-r from-google-blue-600 to-indigo-600 text-white shadow-sm' : 'text-google-surface-600 hover:text-google-surface-900'"
              @click="adminView = 'create'"
            >
              📝 Buat KPM Baru
            </button>
            <button
              class="rounded-full px-4 py-2 text-xs font-bold transition-all duration-200"
              :class="adminView === 'monitor' ? 'bg-gradient-to-r from-google-blue-600 to-indigo-600 text-white shadow-sm' : 'text-google-surface-600 hover:text-google-surface-900'"
              @click="adminView = 'monitor'; loadMonitoring()"
            >
              📊 Pantau KPM ({{ monitoring.length }})
            </button>
            <button
              class="rounded-full px-4 py-2 text-xs font-bold transition-all duration-200"
              :class="adminView === 'map' ? 'bg-gradient-to-r from-google-blue-600 to-indigo-600 text-white shadow-sm' : 'text-google-surface-600 hover:text-google-surface-900'"
              @click="adminView = 'map'; loadMonitoring()"
            >
              🗺️ Live Radar Armada
            </button>
          </div>
        </div>

        <!-- CREATE KPM PANEL -->
        <AdminCreatePanel
          v-if="adminView === 'create'"
          :master="master"
          :busy="busy"
          @create="handleCreateKpm"
        />

        <!-- MONITORING PANEL -->
        <AdminMonitoringPanel
          v-else-if="adminView === 'monitor'"
          :monitoring="filteredMonitoring"
          :master="master"
          :busy="busy"
          :filter="filter"
          @update:filter="filter = $event"
          @refresh="loadMonitoring(true)"
          @change-status="handleAdminChangeStatus"
          @archive="handleArchiveKpm"
          @edit-material="startEditLatestKpm"
        />

        <!-- LIVE RADAR FLEET MAP VIEW -->
        <div v-else-if="adminView === 'map'">
          <LiveTrackingMap
            :monitoringData="monitoring"
            :firebaseDbUrl="master.firebaseDbUrl"
          />
        </div>

        <!-- MODAL: KELOLA MATERIAL KPM TERBARU -->
        <MaterialEditorModal
          :editingKpm="editingKpm"
          :editItemsList="editItemsList"
          :master="master"
          :busy="busy"
          @close="editingKpm = null"
          @add-item="addEditItem"
          @remove-item="removeEditItem"
          @save="saveLatestKpmItems"
        />
      </section>

      <!-- PERSONEL / DRIVER SECTION -->
      <DriverDeliveryPanel
        v-else
        :deliveries="deliveries"
        :selectedDelivery="selectedDelivery"
        :driverName="driverName"
        :busy="busy"
        @select-delivery="selectedDelivery = $event"
        @refresh-deliveries="loadDeliveries(true)"
        @update-driver-name="driverName = $event"
        @submit-status-update="handleDriverStatusUpdate"
      />
    </main>
  </div>
</template>
