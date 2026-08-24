<template>
  <div class="min-h-screen bg-google-surface-900 text-slate-100 pb-20 font-sans text-sm">
    <!-- Header (Google M3 Top AppBar - Enlarged) -->
    <header class="bg-google-surface-800/95 backdrop-blur-md border-b border-google-surface-700 px-4 sm:px-6 py-3.5 sticky top-0 z-20 shadow-m3-2">
      <div class="max-w-xl mx-auto flex items-center justify-between">
        <div class="flex items-center gap-3.5">
          <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-google-blue-600 via-indigo-500 to-google-green-500 flex items-center justify-center font-bold text-white shadow-lg shadow-google-blue-500/25 ring-1 ring-white/20 text-2xl">
            🚚
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-lg font-extrabold text-white leading-tight">Driver KPM</h1>
              <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-google-blue-500/20 text-google-blue-300 border border-google-blue-500/30">M3</span>
            </div>
            <span class="text-xs text-google-surface-200 block font-medium">Line Feeding System</span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="showSettingsModal = true"
            class="p-2.5 rounded-full bg-google-surface-700 hover:bg-google-surface-600 text-sm font-bold text-google-surface-200 hover:text-white active:scale-95 transition border border-google-surface-600 shadow-sm"
            title="Pengaturan Server"
          >
            ⚙️
          </button>
          <button
            @click="loadData"
            :disabled="isLoading"
            class="px-4 py-2 rounded-full bg-google-surface-700 hover:bg-google-surface-600 text-xs sm:text-sm font-bold text-google-blue-300 active:scale-95 transition disabled:opacity-50 flex items-center gap-1.5 border border-google-surface-600 shadow-sm"
          >
            <span :class="{ 'animate-spin inline-block': isLoading }">↻</span>
            <span>{{ isLoading ? 'Memuat...' : 'Segarkan' }}</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Main Container -->
    <main class="max-w-xl mx-auto p-4 sm:p-5 space-y-4 sm:space-y-5">
      <!-- Driver Name Setting (M3 Outlined Surface) -->
      <div class="bg-google-surface-800/90 rounded-2xl p-4 border border-google-surface-700/80 flex items-center gap-3.5 shadow-m3-1">
        <span class="text-sm font-bold text-google-surface-200 shrink-0">Nama Driver:</span>
        <input
          v-model="driverName"
          @change="saveDriverName"
          type="text"
          placeholder="Ketik nama Anda (misal: AANG)"
          class="flex-1 px-3.5 py-2.5 bg-google-surface-900 border border-google-surface-600 rounded-xl text-sm text-white font-bold placeholder:font-normal placeholder:text-google-surface-400 focus:outline-none focus:border-google-blue-400 focus:ring-2 focus:ring-google-blue-500/20 uppercase transition"
        />
      </div>

      <!-- M3 Segmented Pill Tabs -->
      <div class="grid grid-cols-2 gap-2 bg-google-surface-800 p-2 rounded-full border border-google-surface-700 text-sm font-bold text-center shadow-m3-1">
        <button
          @click="activeTab = 'siap'"
          class="py-2.5 px-4 rounded-full transition-all duration-200 flex items-center justify-center gap-2"
          :class="activeTab === 'siap' ? 'bg-gradient-to-r from-google-blue-600 to-indigo-600 text-white shadow-m3-1' : 'text-google-surface-200 hover:text-white'"
        >
          <span>Siap Berangkat</span>
          <span class="px-2 py-0.5 rounded-full text-xs font-bold" :class="activeTab === 'siap' ? 'bg-white/20' : 'bg-google-surface-700'">{{ siapList.length }}</span>
        </button>
        <button
          @click="activeTab = 'jalan'"
          class="py-2.5 px-4 rounded-full transition-all duration-200 flex items-center justify-center gap-2"
          :class="activeTab === 'jalan' ? 'bg-gradient-to-r from-google-yellow-600 to-amber-600 text-white shadow-m3-1' : 'text-google-surface-200 hover:text-white'"
        >
          <span>Sedang Jalan</span>
          <span class="px-2 py-0.5 rounded-full text-xs font-bold" :class="activeTab === 'jalan' ? 'bg-white/20' : 'bg-google-surface-700'">{{ jalanList.length }}</span>
        </button>
      </div>

      <!-- Alert Messages -->
      <div
        v-if="noticeMsg"
        class="p-4 rounded-2xl text-sm font-bold flex items-center justify-between shadow-m3-1 transition animate-fadeIn"
        :class="noticeType === 'success' ? 'bg-google-green-900/40 text-google-green-200 border border-google-green-600/50' : 'bg-google-red-900/40 text-google-red-200 border border-google-red-600/50'"
      >
        <span class="flex items-center gap-2.5">
          <span class="text-base">{{ noticeType === 'success' ? '✓' : '⚠' }}</span>
          <span>{{ noticeMsg }}</span>
        </span>
        <button @click="noticeMsg = ''" class="text-base leading-none ml-2 p-1.5 hover:opacity-80">✕</button>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading && !deliveries.length" class="text-center py-16 text-google-surface-200 text-sm">
        <p class="text-4xl mb-3 animate-bounce">⏳</p>
        <p class="font-bold">Memuat data tugas pengiriman...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="!currentList.length" class="text-center py-16 bg-google-surface-800/60 rounded-3xl border border-google-surface-700/60 p-8 text-google-surface-300 shadow-m3-1">
        <p class="text-5xl mb-4">📦</p>
        <p class="text-base font-bold text-white">Tidak ada KPM pada tab ini</p>
        <p class="text-xs sm:text-sm text-google-surface-300 mt-1.5">
          {{ activeTab === 'siap' ? 'Belum ada KPM yang siap berangkat.' : 'Tidak ada KPM yang sedang dalam perjalanan.' }}
        </p>
      </div>

      <!-- Delivery List -->
      <div v-else class="space-y-4">
        <div
          v-for="item in currentList"
          :key="item.nomor || item.kpmId"
          class="bg-google-surface-800/90 border border-google-surface-700/80 rounded-3xl p-5 shadow-m3-2 hover:shadow-m3-3 transition-all space-y-4"
        >
          <!-- Header Card -->
          <div class="flex items-start justify-between gap-3">
            <div>
              <span class="text-sm font-mono font-extrabold text-google-blue-400 tracking-wider">
                {{ item.nomor || item.kpmId }}
              </span>
              <div class="text-base font-bold text-white mt-1">{{ item.proyek || 'Line Feeding' }}</div>
            </div>
            <span
              class="px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide flex items-center gap-2 shrink-0"
              :class="item.status === 'Jalan' ? 'bg-google-yellow-500/20 text-google-yellow-300 border border-google-yellow-500/40' : 'bg-google-blue-500/20 text-google-blue-300 border border-google-blue-500/40'"
            >
              <span class="w-2 h-2 rounded-full" :class="item.status === 'Jalan' ? 'bg-google-yellow-400 animate-pulse' : 'bg-google-blue-400'"></span>
              {{ item.status }}
            </span>
          </div>

          <!-- Route Stepper (Enlarged) -->
          <div class="bg-google-surface-900/80 p-4 rounded-2xl border border-google-surface-700/60 flex items-center justify-between text-sm">
            <div class="text-slate-200 truncate max-w-[45%]">
              <div class="text-xs text-google-blue-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-google-blue-400"></span> ASAL
              </div>
              <div class="truncate mt-1 font-extrabold text-white text-sm sm:text-base">{{ item.wsAwal || '-' }}</div>
            </div>
            <span class="text-google-surface-400 font-extrabold text-lg px-2">➔</span>
            <div class="text-right text-slate-200 truncate max-w-[45%]">
              <div class="text-xs text-google-green-300 font-bold uppercase tracking-wider flex items-center justify-end gap-1.5">
                TUJUAN <span class="w-2 h-2 rounded-full bg-google-green-400"></span>
              </div>
              <div class="truncate mt-1 font-extrabold text-google-green-400 text-sm sm:text-base">{{ item.wsTujuan || '-' }}</div>
            </div>
          </div>

          <!-- Items List (Enlarged) -->
          <div class="bg-google-surface-900/50 p-3.5 rounded-2xl border border-google-surface-700/40 space-y-2">
            <div class="flex items-center justify-between font-bold text-white text-xs sm:text-sm mb-1.5">
              <span>Daftar Material:</span>
              <span class="text-google-blue-400 font-mono text-xs">{{ item.daftarBarang?.length || 1 }} Macam</span>
            </div>
            <div
              v-for="(barang, bIdx) in (item.daftarBarang || [{ nama: item.spek || 'Material', qty: item.qty || 1, uom: item.uom || 'PCS' }])"
              :key="bIdx"
              class="flex justify-between items-center text-xs sm:text-sm py-1 border-b border-google-surface-700/40 last:border-0"
            >
              <span class="truncate pr-3 text-slate-200">{{ barang.nama || barang.spek }}</span>
              <span class="font-bold text-google-green-300 font-mono shrink-0 px-2 py-0.5 bg-google-green-950/40 rounded-md border border-google-green-800/40">
                {{ barang.qty }} {{ barang.uom || 'PCS' }}
              </span>
            </div>
          </div>

          <!-- PIC & Waktu -->
          <div class="flex items-center justify-between text-xs sm:text-sm text-google-surface-300 px-1 font-medium">
            <span>PIC: <b class="text-white">{{ item.pic || '-' }}</b></span>
            <span v-if="item.waktuBerangkat" class="text-google-yellow-300 font-mono">🕒 {{ item.waktuBerangkat }}</span>
          </div>

          <!-- Action Button (Enlarged Pill) -->
          <button
            @click="openModalFor(item)"
            class="w-full py-3.5 px-5 rounded-full font-bold text-sm tracking-wide flex items-center justify-center gap-2.5 shadow-m3-2 transition active:scale-[0.98] ring-1 ring-white/10"
            :class="item.status === 'Jalan' ? 'bg-gradient-to-r from-google-green-600 to-teal-600 hover:from-google-green-500 hover:to-teal-500 text-white shadow-google-green-500/25' : 'bg-gradient-to-r from-google-blue-600 via-indigo-600 to-google-blue-500 hover:from-google-blue-500 hover:to-indigo-500 text-white shadow-google-blue-500/25'"
          >
            <span class="text-base">📷</span>
            <span>{{ item.status === 'Jalan' ? 'Konfirmasi Tiba (Foto Bukti)' : 'Mulai Jalan (Foto Muat)' }}</span>
          </button>
        </div>
      </div>
    </main>

    <!-- Hidden Native Camera File Input -->
    <input
      ref="nativeCameraInput"
      type="file"
      accept="image/*"
      capture="environment"
      class="hidden"
      @change="onPhotoSelected"
    />

    <!-- Camera / Action Modal (M3 Bottom Sheet - Enlarged) -->
    <div
      v-if="selectedItem"
      class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn"
    >
      <div
        class="bg-google-surface-900 border border-google-surface-700 w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-6 space-y-5 shadow-2xl animate-slideUp max-h-[92vh] overflow-y-auto"
      >
        <!-- Bottom Sheet Grab Handle -->
        <div class="w-16 h-2 bg-google-surface-600 rounded-full mx-auto sm:hidden mb-2"></div>

        <!-- Modal Header -->
        <div class="flex items-center justify-between border-b border-google-surface-700 pb-4">
          <div>
            <h3 class="text-base sm:text-lg font-bold text-white">
              {{ selectedItem.status === 'Jalan' ? 'Konfirmasi Kedatangan' : 'Konfirmasi Keberangkatan' }}
            </h3>
            <p class="text-xs sm:text-sm text-google-blue-400 font-mono font-bold mt-1">
              {{ selectedItem.nomor || selectedItem.kpmId }}
            </p>
          </div>
          <button @click="closeModal" class="w-9 h-9 rounded-full bg-google-surface-800 text-google-surface-300 hover:text-white flex items-center justify-center text-base font-bold transition">✕</button>
        </div>

        <!-- Route Visual Box -->
        <div class="bg-google-surface-800 p-4 rounded-2xl border border-google-surface-700 text-xs sm:text-sm space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-google-surface-300">Rute:</span>
            <span class="font-extrabold text-google-green-400">{{ selectedItem.wsAwal }} ➔ {{ selectedItem.wsTujuan }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-google-surface-300">Status Berikutnya:</span>
            <span class="font-bold text-google-yellow-300">{{ selectedItem.status === 'Jalan' ? 'Tiba di Workshop Tujuan' : 'Dalam Perjalanan (Jalan)' }}</span>
          </div>
        </div>

        <!-- Camera / Photo Zone (Enlarged) -->
        <div class="space-y-3">
          <label class="text-xs sm:text-sm font-bold text-google-surface-200 block">
            {{ selectedItem.status === 'Jalan' ? '📷 Foto Bukti Kedatangan (Wajib)' : '📷 Foto Muatan Berangkat (Wajib)' }}
          </label>

          <div
            v-if="!photoPreview"
            @click="triggerCamera"
            class="border-2 border-dashed border-google-blue-500/50 hover:border-google-blue-400 bg-google-surface-800/80 rounded-3xl p-8 sm:p-10 text-center cursor-pointer transition active:scale-98 shadow-inner"
          >
            <div class="w-16 h-16 rounded-2xl bg-google-blue-500/20 text-google-blue-400 flex items-center justify-center text-3xl mx-auto mb-3 border border-google-blue-500/30">
              📷
            </div>
            <p class="text-sm sm:text-base font-bold text-white">Ketuk untuk Buka Kamera</p>
            <p class="text-xs text-google-surface-300 mt-1.5">Gunakan kamera HP untuk ambil bukti foto</p>
          </div>

          <div v-else class="space-y-3">
            <div class="relative rounded-2xl overflow-hidden border border-google-surface-700 bg-black max-h-64 flex items-center justify-center">
              <img :src="photoPreview" alt="Preview Foto" class="w-full h-auto max-h-64 object-contain" />
              <div class="absolute top-3 right-3 bg-google-green-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                ✓ Siap Dikirim
              </div>
            </div>
            <button
              @click="triggerCamera"
              class="w-full py-2.5 bg-google-surface-800 hover:bg-google-surface-700 text-google-blue-300 rounded-xl text-xs sm:text-sm font-bold transition border border-google-surface-600"
            >
              Ambil Ulang Foto ↺
            </button>
          </div>
        </div>

        <!-- Confirm Buttons (Enlarged M3 Pills) -->
        <div class="flex gap-3 pt-3 border-t border-google-surface-700">
          <button
            @click="closeModal"
            :disabled="isSubmitting"
            class="flex-1 py-3.5 bg-google-surface-800 hover:bg-google-surface-700 rounded-full text-xs sm:text-sm font-bold text-slate-300 disabled:opacity-50 transition border border-google-surface-600"
          >
            Batal
          </button>
          <button
            @click="submitUpdate"
            :disabled="isSubmitting || !photoPreview"
            class="flex-[2] py-3.5 rounded-full text-xs sm:text-sm font-bold text-white shadow-m3-2 transition active:scale-98 disabled:opacity-50"
            :class="selectedItem.status === 'Jalan' ? 'bg-gradient-to-r from-google-green-600 to-teal-600 hover:from-google-green-500 hover:to-teal-500 shadow-google-green-500/25' : 'bg-gradient-to-r from-google-blue-600 via-indigo-600 to-google-blue-500 hover:from-google-blue-500 hover:to-indigo-500 shadow-google-blue-500/25'"
          >
            {{ isSubmitting ? 'Mengirim Data...' : 'Kirim Sekarang ✓' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Server Settings Modal (Enlarged) -->
    <div
      v-if="showSettingsModal"
      class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div class="bg-google-surface-900 border border-google-surface-700 w-full max-w-lg rounded-3xl p-6 space-y-5 shadow-2xl animate-scaleIn">
        <div class="flex items-center justify-between border-b border-google-surface-700 pb-4">
          <div class="flex items-center gap-2.5">
            <span class="text-xl">⚙️</span>
            <h3 class="text-base font-bold text-white">Pengaturan Google Apps Script</h3>
          </div>
          <button @click="showSettingsModal = false" class="w-8 h-8 rounded-full bg-google-surface-800 text-google-surface-300 hover:text-white flex items-center justify-center text-base font-bold transition">✕</button>
        </div>

        <div class="space-y-4 text-xs sm:text-sm">
          <div>
            <label class="font-bold text-google-surface-200 block mb-1.5">Google Apps Script Web App URL:</label>
            <input
              v-model="gasUrlInput"
              type="url"
              placeholder="https://script.google.com/macros/s/.../exec"
              class="w-full px-3.5 py-2.5 bg-google-surface-800 border border-google-surface-600 rounded-xl text-xs sm:text-sm text-white placeholder:text-google-surface-400 focus:outline-none focus:border-google-blue-400 focus:ring-2 focus:ring-google-blue-500/20 font-mono"
            />
          </div>

          <div>
            <label class="font-bold text-google-surface-200 block mb-1.5">Driver API Token:</label>
            <input
              v-model="driverTokenInput"
              type="password"
              placeholder="Token rahasia Driver"
              class="w-full px-3.5 py-2.5 bg-google-surface-800 border border-google-surface-600 rounded-xl text-xs sm:text-sm text-white placeholder:text-google-surface-400 focus:outline-none focus:border-google-blue-400 focus:ring-2 focus:ring-google-blue-500/20 font-mono"
            />
            <p class="text-xs text-google-surface-300 mt-1.5">
              Aplikasi terhubung langsung ke backend Google Sheets tanpa perantara web proxy.
            </p>
          </div>
        </div>

        <div class="flex gap-3 pt-3 border-t border-google-surface-700">
          <button
            @click="resetDefaultConfig"
            class="flex-1 py-3 bg-google-surface-800 hover:bg-google-surface-700 rounded-full text-xs sm:text-sm font-bold text-google-surface-200 transition border border-google-surface-600"
          >
            Reset Default
          </button>
          <button
            @click="saveConfig"
            class="flex-1 py-3 bg-gradient-to-r from-google-blue-600 to-indigo-600 text-white rounded-full text-xs sm:text-sm font-bold transition shadow-m3-1"
          >
            Simpan & Muat
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getDriverDeliveries, sendStatusUpdate, getActiveGasUrl, getActiveDriverToken, setCustomConfig } from './services/api'
import { compressImage } from './services/imageCompressor'

const deliveries = ref([])
const activeTab = ref('siap')
const isLoading = ref(false)
const isSubmitting = ref(false)
const driverName = ref(localStorage.getItem('kpm_driver_name') || 'AANG')

const showSettingsModal = ref(false)
const gasUrlInput = ref(getActiveGasUrl())
const driverTokenInput = ref(getActiveDriverToken())

const selectedItem = ref(null)
const photoPreview = ref('')
const nativeCameraInput = ref(null)

const noticeMsg = ref('')
const noticeType = ref('success')

function showNotice(msg, type = 'success') {
  noticeMsg.value = msg
  noticeType.value = type
  setTimeout(() => {
    if (noticeMsg.value === msg) noticeMsg.value = ''
  }, 4000)
}

const siapList = computed(() =>
  deliveries.value.filter(d =>
    d.status === 'Belum Berangkat' ||
    d.currentStatus === 'Belum Berangkat' ||
    d.statusCode === 'BELUM_BERANGKAT'
  )
)

const jalanList = computed(() =>
  deliveries.value.filter(d =>
    d.status === 'Jalan' ||
    d.currentStatus === 'Jalan' ||
    d.status === 'Berangkat' ||
    d.statusCode === 'BERANGKAT'
  )
)

const currentList = computed(() => activeTab.value === 'siap' ? siapList.value : jalanList.value)

function saveDriverName() {
  if (driverName.value) {
    driverName.value = driverName.value.trim().toUpperCase()
    localStorage.setItem('kpm_driver_name', driverName.value)
  }
}

function saveConfig() {
  setCustomConfig(gasUrlInput.value, driverTokenInput.value)
  showSettingsModal.value = false
  showNotice('Konfigurasi Google Apps Script disimpan.', 'success')
  loadData()
}

function resetDefaultConfig() {
  setCustomConfig('', '')
  gasUrlInput.value = getActiveGasUrl()
  driverTokenInput.value = getActiveDriverToken()
  showSettingsModal.value = false
  showNotice('Konfigurasi dikembalikan ke default.', 'success')
  loadData()
}

async function loadData() {
  isLoading.value = true
  try {
    const data = await getDriverDeliveries()
    deliveries.value = data
    console.log('[KPM Driver Data Loaded]', data)
  } catch (err) {
    showNotice(err.message || 'Gagal memuat data.', 'error')
  } finally {
    isLoading.value = false
  }
}

function openModalFor(item) {
  selectedItem.value = item
  photoPreview.value = ''
}

function closeModal() {
  if (isSubmitting.value) return
  selectedItem.value = null
  photoPreview.value = ''
}

function triggerCamera() {
  if (nativeCameraInput.value) {
    nativeCameraInput.value.click()
  }
}

async function onPhotoSelected(e) {
  const file = e.target.files?.[0]
  if (!file) return

  try {
    isLoading.value = true
    photoPreview.value = await compressImage(file, 960, 0.7)
  } catch (err) {
    showNotice(err.message || 'Gagal memproses foto.', 'error')
  } finally {
    isLoading.value = false
  }
}

async function submitUpdate() {
  if (!selectedItem.value || !photoPreview.value) {
    showNotice('Foto bukti wajib diambil terlebih dahulu.', 'error')
    return
  }

  saveDriverName()
  isSubmitting.value = true
  const isJalan = (selectedItem.value.status === 'Jalan' || selectedItem.value.statusCode === 'BERANGKAT')
  const targetStatus = isJalan ? 'Tiba' : 'Jalan'
  const kpmNo = selectedItem.value.nomor || selectedItem.value.kpmId

  try {
    await sendStatusUpdate({
      nomorKPM: kpmNo,
      statusKPM: targetStatus,
      fotoData: photoPreview.value,
      namaPIC: driverName.value || 'DRIVER',
      lokasiWorkshop: `${selectedItem.value.wsAwal || ''} ➔ ${selectedItem.value.wsTujuan || ''}`
    })

    showNotice(`KPM ${kpmNo} berhasil diubah ke '${targetStatus}'!`, 'success')
    closeModal()
    await loadData()
  } catch (err) {
    showNotice(err.message || 'Gagal mengirim update status.', 'error')
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>
