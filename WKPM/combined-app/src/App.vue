<script setup>
import { computed, onMounted, ref } from 'vue'

const scriptUrl = import.meta.env.VITE_API_URL || '/api'
const requestTimeout = 30000

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
const photoFile = ref(null)

const createForm = ref({
  lokasiBerangkat: '', lokasiTiba: '', namaPIC: '', namaProyek: '',
  items: [{ nama: '', qty: 1, uom: 'PCS' }],
})
const updateForm = ref({ statusKPM: '', fotoData: '' })

const filteredMonitoring = computed(() => filter.value === 'Semua'
  ? monitoring.value
  : monitoring.value.filter(item => item.status === filter.value))

function clearNotice() { message.value = ''; error.value = '' }

async function api(action, options = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), requestTimeout)
  try {
    const params = new URLSearchParams(options.body || {})
    params.set('action', action)
    params.set('role', mode.value)
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

async function loadMaster() {
  if (mode.value !== 'admin') return
  try {
    const data = await api('getMasterData', { method: 'GET' })
    master.value = data || master.value
  } catch (e) { error.value = e.message }
}

async function loadMonitoring(forceRefresh = false) {
  clearNotice(); busy.value = true
  try {
    const body = forceRefresh ? { refresh: 'true' } : {}
    monitoring.value = (await api('getMonitoring', { method: 'GET', body })) || []
  }
  catch (e) { error.value = e.message }
  finally { busy.value = false }
}

async function loadDeliveries(forceRefresh = false) {
  clearNotice(); busy.value = true; selectedDelivery.value = null
  try {
    const body = forceRefresh ? { refresh: 'true' } : {}
    deliveries.value = (await api('getDeliveries', { method: 'GET', body })) || []
  }
  catch (e) { error.value = e.message }
  finally { busy.value = false }
}

function addItem() { createForm.value.items.push({ nama: '', qty: 1, uom: master.value.uoms[0] || 'PCS' }) }
function removeItem(index) {
  if (createForm.value.items.length > 1) createForm.value.items.splice(index, 1)
}

async function createKpm() {
  clearNotice()
  if (!createForm.value.lokasiBerangkat || !createForm.value.lokasiTiba || !createForm.value.namaPIC || !createForm.value.namaProyek) {
    error.value = 'Lengkapi semua data utama terlebih dahulu.'; return
  }
  if (createForm.value.items.some(item => !item.nama.trim() || Number(item.qty) <= 0)) {
    error.value = 'Pastikan semua material memiliki nama dan kuantitas positif.'; return
  }
  busy.value = true
  try {
    const data = await api('createKpm', {
      body: {
        namaPIC: createForm.value.namaPIC,
        namaProyek: createForm.value.namaProyek,
        lokasiBerangkat: createForm.value.lokasiBerangkat,
        lokasiTiba: createForm.value.lokasiTiba,
        daftarBarang: JSON.stringify(createForm.value.items),
      },
    })
    message.value = `KPM ${data?.nomor || data?.kpmId || ''} berhasil dibuat.`
    createForm.value = { lokasiBerangkat: '', lokasiTiba: '', namaPIC: '', namaProyek: '', items: [{ nama: '', qty: 1, uom: 'PCS' }] }
  } catch (e) { error.value = e.message }
  finally { busy.value = false }
}

async function archive(item) {
  if (!confirm(`Sembunyikan KPM ${item.nomor} dari pantauan?`)) return
  clearNotice(); busy.value = true
  try { await api('archiveKpm', { body: { nomorKPM: item.nomor, statusKPM: 'Selesai' } }); message.value = 'KPM berhasil diarsipkan.'; await loadMonitoring() }
  catch (e) { error.value = e.message }
  finally { busy.value = false }
}

function chooseDelivery(item) {
  selectedDelivery.value = item
  updateForm.value.statusKPM = item.nextAction || ''
  updateForm.value.fotoData = ''
  photoFile.value = null
}

function onPhoto(event) { photoFile.value = event.target.files?.[0] || null }

async function compressImage(file) {
  const MAX_WIDTH = 1000
  const JPEG_QUALITY = 0.72

  // Fast path: createImageBitmap decodes off main thread (no DOM Image blocking)
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_WIDTH / bitmap.width)
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))
    // OffscreenCanvas avoids layout/paint overhead when available
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
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close()
    return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
  }

  // Fallback: DOM Image decode
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

async function updateStatus() {
  clearNotice()
  if (!selectedDelivery.value || !updateForm.value.statusKPM) { error.value = 'Pilih KPM dan status terlebih dahulu.'; return }
  if (!photoFile.value) { error.value = 'Foto bukti wajib dilampirkan.'; return }
  busy.value = true
  try {
    updateForm.value.fotoData = await compressImage(photoFile.value)
    await api('updateStatus', {
      body: {
        nomorKPM: selectedDelivery.value.nomor || selectedDelivery.value.kpmId,
        statusKPM: updateForm.value.statusKPM,
        namaPIC: selectedDelivery.value.pic,
        lokasiWorkshop: updateForm.value.statusKPM === 'Tiba'
          ? (selectedDelivery.value.lokasiTiba || selectedDelivery.value.lokasi)
          : (selectedDelivery.value.lokasiBerangkat || selectedDelivery.value.lokasi),
        fotoData: updateForm.value.fotoData,
      },
    })
    message.value = 'Status KPM berhasil diperbarui.'
    await loadDeliveries()
  } catch (e) { error.value = e.message }
  finally { busy.value = false }
}

function statusClass(status) {
  return {
    'Baru Dibuat': 'bg-google-surface-200 text-google-surface-800 border border-google-surface-300',
    'Belum Berangkat': 'bg-google-blue-50 text-google-blue-700 border border-google-blue-200',
    'Jalan': 'bg-google-yellow-50 text-google-yellow-800 border border-google-yellow-200',
    'Tiba': 'bg-google-green-50 text-google-green-700 border border-google-green-200',
    'Selesai': 'bg-google-blue-50 text-google-blue-800 border border-google-blue-200',
  }[status] || 'bg-google-surface-100 text-google-surface-700 border border-google-surface-200'
}

onMounted(() => {
  if (mode.value === 'admin') loadMaster()
  else loadDeliveries()
})
</script>

<template>
  <div class="min-h-screen bg-google-surface-50 font-sans">
    <!-- Google 4-Color Accent Top Bar -->
    <div class="google-bar"></div>

    <!-- Header (Google Workspace AppBar) -->
    <header class="border-b border-google-surface-300/70 bg-white/90 backdrop-blur-md sticky top-0 z-20 shadow-sm">
      <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
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

        <div class="flex items-center gap-2">
          <div class="flex rounded-full bg-google-surface-100 p-1 border border-google-surface-300/60 shadow-inner" role="tablist">
            <span class="rounded-full bg-white px-3.5 py-1 text-xs font-bold text-google-blue-700 shadow-sm border border-google-surface-300/40">
              {{ mode === 'admin' ? '🛡️ Admin Portal' : '🚚 Personel Driver' }}
            </span>
          </div>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <!-- Notices (Google Red & Green) -->
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
      <section v-if="mode === 'admin'">
        <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 class="text-xl font-bold text-google-surface-800">Admin Dashboard</h2>
            <p class="text-xs text-google-surface-500 mt-0.5">Buat penugasan baru dan pantau pergerakan KPM secara real-time.</p>
          </div>

          <!-- M3 Segmented Navigation Tabs -->
          <div class="flex bg-google-surface-100 p-1 rounded-full border border-google-surface-300/70 shadow-sm">
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
          </div>
        </div>

        <!-- CREATE KPM FORM -->
        <form v-if="adminView === 'create'" class="panel space-y-6" @submit.prevent="createKpm">
          <div class="border-b border-google-surface-200 pb-3">
            <h3 class="text-base font-bold text-google-surface-800">Informasi Rute & Penugasan</h3>
            <p class="text-xs text-google-surface-500">Pilih rute workshop dan nama penanggung jawab.</p>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <label>
              <span class="label">Lokasi Berangkat (Asal)</span>
              <select v-model="createForm.lokasiBerangkat" class="field" required>
                <option value="">-- Pilih Lokasi Asal --</option>
                <option v-for="item in master.workshops" :key="item" :value="item">{{ item }}</option>
              </select>
            </label>
            <label>
              <span class="label">Lokasi Tiba (Tujuan)</span>
              <select v-model="createForm.lokasiTiba" class="field" required>
                <option value="">-- Pilih Lokasi Tujuan --</option>
                <option v-for="item in master.workshops" :key="item" :value="item">{{ item }}</option>
              </select>
            </label>
            <label>
              <span class="label">PIC Penanggung Jawab</span>
              <select v-model="createForm.namaPIC" class="field" required>
                <option value="">-- Pilih Nama PIC --</option>
                <option v-for="item in master.pics" :key="item" :value="item">{{ item }}</option>
              </select>
            </label>
            <label>
              <span class="label">Nama Proyek</span>
              <input v-model="createForm.namaProyek" class="field" required placeholder="Contoh: Proyek Line Feeding 1" />
            </label>
          </div>

          <div class="pt-2">
            <div class="mb-3 flex items-center justify-between">
              <div>
                <h3 class="text-sm font-bold text-google-surface-800">Daftar Material Bawaan</h3>
                <p class="text-xs text-google-surface-500">Spesifikasi barang, kuantitas, dan satuan.</p>
              </div>
              <button type="button" class="btn-secondary !py-1.5 !px-3.5 !text-xs !font-bold text-google-blue-700" @click="addItem">
                + Tambah Baris
              </button>
            </div>

            <div class="space-y-2.5">
              <div v-for="(item, index) in createForm.items" :key="index" class="grid gap-2.5 sm:grid-cols-[1fr_120px_130px_auto] items-center bg-google-surface-50 p-3 rounded-2xl border border-google-surface-200">
                <input v-model="item.nama" class="field mt-0 bg-white" required placeholder="Deskripsi nama material..." />
                <input v-model.number="item.qty" class="field mt-0 bg-white" min="1" type="number" required placeholder="Qty" />
                <select v-model="item.uom" class="field mt-0 bg-white">
                  <option v-for="uom in master.uoms" :key="uom" :value="uom">{{ uom }}</option>
                </select>
                <button type="button" class="btn-danger !py-2.5 !px-3.5 !rounded-xl" :disabled="createForm.items.length === 1" @click="removeItem(index)">
                  ✕
                </button>
              </div>
            </div>
          </div>

          <div class="pt-4 border-t border-google-surface-200">
            <button class="btn-primary w-full !py-3.5 !text-sm !font-bold tracking-wide" :disabled="busy">
              {{ busy ? 'Menyimpan ke Server...' : 'Simpan & Terbitkan KPM ✓' }}
            </button>
          </div>
        </form>

        <!-- MONITORING VIEW -->
        <div v-else class="space-y-4">
          <!-- Filter Chips (Google M3) -->
          <div class="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-google-surface-300/70 shadow-sm">
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="option in ['Semua', 'Baru Dibuat', 'Belum Berangkat', 'Jalan', 'Tiba']"
                :key="option"
                class="chip transition-all duration-200 border"
                :class="filter === option ? 'bg-google-blue-600 text-white border-google-blue-600 shadow-sm' : 'bg-google-surface-100 text-google-surface-700 border-google-surface-300/60 hover:bg-google-surface-200'"
                @click="filter = option"
              >
                {{ option }}
              </button>
            </div>
            <button class="btn-secondary !py-1.5 !px-3.5 !text-xs !font-bold" :disabled="busy" @click="loadMonitoring(true)">
              <span :class="{ 'animate-spin inline-block': busy }">↻</span>
              <span class="ml-1">Segarkan</span>
            </button>
          </div>

          <div v-if="!filteredMonitoring.length" class="panel text-center py-12 text-google-surface-400">
            <p class="text-3xl mb-2">📦</p>
            <p class="text-sm font-semibold text-google-surface-600">Tidak ada KPM pada kategori ini.</p>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <article v-for="item in filteredMonitoring" :key="item.nomor" class="panel hover:shadow-m3-2 transition-all">
              <div class="flex flex-wrap items-start justify-between gap-2 border-b border-google-surface-200/80 pb-3">
                <div>
                  <span class="text-xs font-mono font-bold text-google-blue-700 tracking-wider uppercase">{{ item.nomor }}</span>
                  <h3 class="text-base font-bold text-google-surface-900 mt-0.5">{{ item.proyek || 'Line Feeding' }}</h3>
                  <p class="text-xs text-google-surface-500 font-medium">{{ item.lokasi }}</p>
                </div>
                <span class="chip !text-[11px] !font-bold" :class="statusClass(item.status)">{{ item.status }}</span>
              </div>

              <div class="mt-3.5 grid gap-2 text-xs sm:grid-cols-3 text-google-surface-600 bg-google-surface-50 p-3 rounded-xl border border-google-surface-200">
                <p><span class="font-bold text-google-surface-800">PIC:</span> {{ item.pic }}</p>
                <p><span class="font-bold text-google-surface-800">Dibuat:</span> {{ item.createdAtFormatted }}</p>
                <p><span class="font-bold text-google-surface-800">Durasi:</span> {{ item.duration || '-' }}</p>
              </div>

              <!-- Progress Bar (Google Green / Blue) -->
              <div class="mt-3.5">
                <div class="flex justify-between text-[11px] font-bold text-google-surface-500 mb-1">
                  <span>Progress Perjalanan</span>
                  <span>{{ item.fillPercent || 0 }}%</span>
                </div>
                <div class="h-2 overflow-hidden rounded-full bg-google-surface-200">
                  <div
                    class="h-full rounded-full bg-gradient-to-r from-google-blue-500 to-google-green-500 transition-all duration-500"
                    :style="{ width: `${item.fillPercent || 0}%` }"
                  ></div>
                </div>
              </div>

              <!-- Collapsible Material Details -->
              <details class="mt-3.5 rounded-xl bg-google-surface-50 p-3 border border-google-surface-200">
                <summary class="cursor-pointer text-xs font-bold text-google-blue-700 outline-none">
                  📦 {{ item.daftarBarang?.length || 0 }} macam material bawaan
                </summary>
                <div class="mt-2 space-y-1 pt-2 border-t border-google-surface-200">
                  <div v-for="material in item.daftarBarang" :key="`${material.nama}-${material.qty}`" class="flex justify-between text-xs text-google-surface-700 py-1 border-b border-google-surface-200/50 last:border-0">
                    <span class="font-medium">{{ material.nama }}</span>
                    <strong class="font-mono text-google-green-700 font-bold">{{ material.qty }} {{ material.uom }}</strong>
                  </div>
                </div>
              </details>

              <button v-if="item.isArrived" class="btn-danger w-full mt-4 !py-2.5 !text-xs !font-bold" :disabled="busy" @click="archive(item)">
                Arsipkan KPM Selesai
              </button>
            </article>
          </div>
        </div>
      </section>

      <!-- PERSONEL / DRIVER SECTION -->
      <section v-else>
        <div class="mb-6">
          <h2 class="text-xl font-bold text-google-surface-800">Portal Pembaruan Personel</h2>
          <p class="text-xs text-google-surface-500 mt-0.5">Pilih KPM yang ditugaskan, lampirkan foto bukti, lalu kirim status perjalanan.</p>
        </div>

        <div class="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <!-- Deliveries List -->
          <div class="panel">
            <div class="flex items-center justify-between pb-3 border-b border-google-surface-200">
              <h3 class="font-bold text-sm text-google-surface-800">Daftar KPM Tersedia</h3>
              <button class="btn-secondary !py-1 !px-3 !text-xs !font-bold" :disabled="busy" @click="loadDeliveries(true)">
                <span :class="{ 'animate-spin inline-block': busy }">↻</span>
              </button>
            </div>

            <div v-if="!deliveries.length" class="py-12 text-center text-xs text-google-surface-400">
              <p class="text-3xl mb-2">🎉</p>
              Tidak ada KPM yang perlu diperbarui saat ini.
            </div>

            <div class="mt-3 space-y-2.5">
              <button
                v-for="item in deliveries"
                :key="item.nomor"
                class="w-full rounded-2xl border p-4 text-left transition-all hover:border-google-blue-400 hover:bg-google-blue-50/50 shadow-sm"
                :class="selectedDelivery?.nomor === item.nomor ? 'border-google-blue-600 bg-google-blue-50/70 ring-2 ring-google-blue-600/20' : 'border-google-surface-300 bg-white'"
                @click="chooseDelivery(item)"
              >
                <div class="flex justify-between items-start gap-2">
                  <div>
                    <span class="text-xs font-mono font-bold text-google-blue-700 uppercase">{{ item.nomor }}</span>
                    <p class="text-xs font-bold text-google-surface-800 mt-0.5">{{ item.proyek || 'Line Feeding' }}</p>
                  </div>
                  <span class="chip !text-[10px] !font-bold bg-google-blue-100 text-google-blue-800 border border-google-blue-200">
                    ➔ {{ item.nextAction }}
                  </span>
                </div>
              </button>
            </div>
          </div>

          <!-- Update Form -->
          <form class="panel space-y-5" @submit.prevent="updateStatus">
            <div v-if="!selectedDelivery" class="py-16 text-center text-xs text-google-surface-400">
              <p class="text-3xl mb-2">👈</p>
              Pilih salah satu KPM dari daftar di sebelah kiri untuk melihat rincian dan mengunggah foto.
            </div>

            <template v-else>
              <div class="border-b border-google-surface-200 pb-3">
                <span class="text-xs font-mono font-bold text-google-blue-700 uppercase">{{ selectedDelivery.nomor }}</span>
                <h3 class="text-base font-bold text-google-surface-900 mt-0.5">{{ selectedDelivery.proyek }}</h3>
                <p class="text-xs text-google-surface-500">{{ selectedDelivery.lokasi }}</p>
              </div>

              <div class="rounded-2xl bg-google-yellow-50/70 border border-google-yellow-200 p-4 text-xs">
                <p class="font-bold text-google-yellow-900 mb-2">📦 Material Bawaan:</p>
                <div v-for="material in selectedDelivery.daftarBarang" :key="`${material.nama}-${material.qty}`" class="flex justify-between py-1 border-b border-google-yellow-200/50 last:border-0 text-google-yellow-950">
                  <span>{{ material.nama }}</span>
                  <strong class="font-mono font-bold">{{ material.qty }} {{ material.uom }}</strong>
                </div>
              </div>

              <label class="block">
                <span class="label">Status Perjalanan Berikutnya</span>
                <select v-model="updateForm.statusKPM" class="field bg-white font-bold text-google-blue-700">
                  <option :value="selectedDelivery.nextAction">{{ selectedDelivery.nextAction }}</option>
                </select>
              </label>

              <label class="block">
                <span class="label">Foto Bukti (Kamera Langsung)</span>
                <input class="field bg-white cursor-pointer file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-google-blue-50 file:text-google-blue-700 hover:file:bg-google-blue-100" type="file" accept="image/*" capture="environment" required @change="onPhoto" />
              </label>

              <div class="pt-2">
                <button class="btn-success w-full !py-3.5 !text-sm !font-bold" :disabled="busy">
                  {{ busy ? 'Mengunggah Data & Foto...' : 'Simpan Pembaruan Status ✓' }}
                </button>
              </div>
            </template>
          </form>
        </div>
      </section>
    </main>
  </div>
</template>

