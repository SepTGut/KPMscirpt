<template>
  <div class="min-h-screen bg-google-surface-900 text-slate-100 pb-16 font-sans">
    <!-- Header (Google M3 Top AppBar) -->
    <header class="bg-google-surface-800/95 backdrop-blur-md border-b border-google-surface-700 px-4 py-3 sticky top-0 z-20 shadow-m3-1">
      <div class="max-w-md mx-auto flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-google-blue-600 via-indigo-500 to-google-green-500 flex items-center justify-center font-bold text-white shadow-lg shadow-google-blue-500/25 ring-1 ring-white/20">
            🚚
          </div>
          <div>
            <div class="flex items-center gap-1.5">
              <h1 class="text-base font-bold text-white leading-none">Driver KPM</h1>
              <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-google-blue-500/20 text-google-blue-300 border border-google-blue-500/30">M3</span>
            </div>
            <span class="text-[11px] text-google-surface-200 mt-0.5 block">Line Feeding System</span>
          </div>
        </div>
        <button
          @click="loadData"
          :disabled="isLoading"
          class="px-3.5 py-1.5 rounded-full bg-google-surface-700 hover:bg-google-surface-600 text-xs font-bold text-google-blue-300 active:scale-95 transition disabled:opacity-50 flex items-center gap-1.5 border border-google-surface-600 shadow-sm"
        >
          <span :class="{ 'animate-spin inline-block': isLoading }">↻</span>
          <span>{{ isLoading ? 'Memuat...' : 'Segarkan' }}</span>
        </button>
      </div>
    </header>

    <!-- Main Container -->
    <main class="max-w-md mx-auto p-4 space-y-4">
      <!-- Driver Name Setting (M3 Outlined Surface) -->
      <div class="bg-google-surface-800/90 rounded-2xl p-3.5 border border-google-surface-700/80 flex items-center gap-3 shadow-m3-1">
        <span class="text-xs font-bold text-google-surface-200 shrink-0">Nama Driver:</span>
        <input
          v-model="driverName"
          @change="saveDriverName"
          type="text"
          placeholder="Ketik nama Anda (misal: AANG)"
          class="flex-1 px-3 py-2 bg-google-surface-900 border border-google-surface-600 rounded-xl text-xs text-white font-bold placeholder:font-normal placeholder:text-google-surface-400 focus:outline-none focus:border-google-blue-400 focus:ring-2 focus:ring-google-blue-500/20 uppercase transition"
        />
      </div>

      <!-- M3 Segmented Pill Tabs -->
      <div class="grid grid-cols-2 gap-1.5 bg-google-surface-800 p-1.5 rounded-full border border-google-surface-700 text-xs font-bold text-center shadow-m3-1">
        <button
          @click="activeTab = 'siap'"
          class="py-2 px-3 rounded-full transition-all duration-200 flex items-center justify-center gap-1.5"
          :class="activeTab === 'siap' ? 'bg-gradient-to-r from-google-blue-600 to-indigo-600 text-white shadow-m3-1' : 'text-google-surface-200 hover:text-white'"
        >
          <span>Siap Berangkat</span>
          <span class="px-1.5 py-0.2 rounded-full text-[10px]" :class="activeTab === 'siap' ? 'bg-white/20' : 'bg-google-surface-700'">{{ siapList.length }}</span>
        </button>
        <button
          @click="activeTab = 'jalan'"
          class="py-2 px-3 rounded-full transition-all duration-200 flex items-center justify-center gap-1.5"
          :class="activeTab === 'jalan' ? 'bg-gradient-to-r from-google-yellow-600 to-amber-600 text-white shadow-m3-1' : 'text-google-surface-200 hover:text-white'"
        >
          <span>Sedang Jalan</span>
          <span class="px-1.5 py-0.2 rounded-full text-[10px]" :class="activeTab === 'jalan' ? 'bg-white/20' : 'bg-google-surface-700'">{{ jalanList.length }}</span>
        </button>
      </div>

      <!-- Alert Messages (Google Green / Google Red) -->
      <div
        v-if="noticeMsg"
        class="p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between shadow-m3-1 transition animate-fadeIn"
        :class="noticeType === 'success' ? 'bg-google-green-900/40 text-google-green-200 border border-google-green-600/50' : 'bg-google-red-900/40 text-google-red-200 border border-google-red-600/50'"
      >
        <span class="flex items-center gap-2">
          <span>{{ noticeType === 'success' ? '✓' : '⚠' }}</span>
          <span>{{ noticeMsg }}</span>
        </span>
        <button @click="noticeMsg = ''" class="text-sm leading-none ml-2 p-1 hover:opacity-80">✕</button>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading && !deliveries.length" class="text-center py-12 text-google-surface-200 text-xs">
        <p class="text-3xl mb-2 animate-bounce">⏳</p>
        Memuat data tugas pengiriman...
      </div>

      <!-- Empty State (M3 Surface Card) -->
      <div v-else-if="!currentList.length" class="text-center py-12 bg-google-surface-800/60 rounded-3xl border border-google-surface-700/60 p-6 text-google-surface-300 shadow-m3-1">
        <p class="text-4xl mb-3">📦</p>
        <p class="text-sm font-bold text-white">Tidak ada KPM pada tab ini</p>
        <p class="text-xs text-google-surface-300 mt-1">
          {{ activeTab === 'siap' ? 'Belum ada KPM yang siap berangkat.' : 'Tidak ada KPM yang sedang dalam perjalanan.' }}
        </p>
      </div>

      <!-- Delivery List (M3 Cards) -->
      <div v-else class="space-y-3.5">
        <div
          v-for="item in currentList"
          :key="item.nomor || item.kpmId"
          class="bg-google-surface-800/90 border border-google-surface-700/80 rounded-2xl p-4 shadow-m3-2 hover:shadow-m3-3 transition-all space-y-3"
        >
          <!-- Header Card -->
          <div class="flex items-start justify-between gap-2">
            <div>
              <span class="text-xs font-mono font-bold text-google-blue-400 tracking-wider">
                {{ item.nomor || item.kpmId }}
              </span>
              <div class="text-xs font-bold text-white mt-0.5">{{ item.proyek || 'Line Feeding' }}</div>
            </div>
            <span
              class="px-3 py-1 rounded-full text-[11px] font-bold tracking-wide flex items-center gap-1.5"
              :class="item.status === 'Jalan' ? 'bg-google-yellow-500/20 text-google-yellow-300 border border-google-yellow-500/40' : 'bg-google-blue-500/20 text-google-blue-300 border border-google-blue-500/40'"
            >
              <span class="w-1.5 h-1.5 rounded-full" :class="item.status === 'Jalan' ? 'bg-google-yellow-400 animate-pulse' : 'bg-google-blue-400'"></span>
              {{ item.status }}
            </span>
          </div>

          <!-- Route Stepper Info (Google Blue origin -> Google Green dest) -->
          <div class="bg-google-surface-900/70 p-3 rounded-xl border border-google-surface-700/50 flex items-center justify-between text-xs font-semibold">
            <div class="text-slate-200 truncate max-w-[45%]">
              <div class="text-[10px] text-google-blue-300 font-bold uppercase tracking-wider flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-google-blue-400"></span> ASAL
              </div>
              <div class="truncate mt-0.5">{{ item.wsAwal || '-' }}</div>
            </div>
            <span class="text-google-blue-400 font-bold px-2">➔</span>
            <div class="text-right text-google-green-400 truncate max-w-[45%]">
              <div class="text-[10px] text-google-green-300 font-bold uppercase tracking-wider flex items-center justify-end gap-1">
                TUJUAN <span class="w-1.5 h-1.5 rounded-full bg-google-green-400"></span>
              </div>
              <div class="truncate mt-0.5">{{ item.wsTujuan || '-' }}</div>
            </div>
          </div>

          <!-- Items Info (Google Yellow Chip) -->
          <div class="text-xs text-google-surface-200 flex items-center gap-2">
            <span class="text-google-yellow-400 font-bold">📦</span>
            <span class="truncate">
              {{ item.items?.map(i => i.spek || i.deskripsi).join(', ') || item.spek || item.deskripsi || 'Material KPM' }}
            </span>
          </div>

          <!-- Action Button (M3 Pill with Google Depth Gradient) -->
          <button
            @click="openModalFor(item)"
            class="w-full py-3 rounded-full font-bold text-xs text-white shadow-m3-2 active:scale-98 transition flex items-center justify-center gap-2 ring-1 ring-white/10"
            :class="item.status === 'Jalan' ? 'bg-gradient-to-r from-google-green-600 to-teal-600 hover:from-google-green-500 hover:to-teal-500 shadow-google-green-500/25' : 'bg-gradient-to-r from-google-blue-600 via-indigo-600 to-google-blue-500 hover:from-google-blue-500 hover:to-indigo-500 shadow-google-blue-500/25'"
          >
            <span>{{ item.status === 'Jalan' ? '🏁 Konfirmasi Tiba (Ambil Foto)' : '🚚 Mulai Jalan (Ambil Foto)' }}</span>
          </button>
        </div>
      </div>
    </main>

    <!-- Modal Ambil Foto & Konfirmasi (Google M3 Bottom Sheet) -->
    <div v-if="selectedItem" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
      <div class="bg-google-surface-900 border border-google-surface-700 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto shadow-m3-4">
        <!-- Bottom Sheet Grab Handle Bar -->
        <div class="w-12 h-1 bg-google-surface-600 rounded-full mx-auto sm:hidden mb-2"></div>

        <!-- Modal Header -->
        <div class="flex items-center justify-between pb-3 border-b border-google-surface-700">
          <div>
            <span class="text-xs font-mono font-bold text-google-blue-400 uppercase tracking-wider">{{ selectedItem.nomor || selectedItem.kpmId }}</span>
            <h3 class="text-base font-bold text-white">
              {{ selectedItem.status === 'Jalan' ? 'Upload Bukti Tiba (Selesai)' : 'Upload Bukti Berangkat (Muat)' }}
            </h3>
          </div>
          <button @click="closeModal" :disabled="isSubmitting" class="w-8 h-8 rounded-full bg-google-surface-800 text-google-surface-300 hover:text-white flex items-center justify-center text-sm font-bold">✕</button>
        </div>

        <!-- Hidden Native File Input (Direct Camera on Android) -->
        <input
          ref="nativeCameraInput"
          type="file"
          accept="image/*"
          capture="environment"
          @change="onPhotoSelected"
          class="hidden"
        />

        <!-- Camera Area (Google M3 Rounded Frame) -->
        <div class="space-y-2">
          <div
            v-if="!photoPreview"
            @click="triggerCamera"
            class="border-2 border-dashed border-google-blue-500/50 hover:border-google-blue-400 bg-google-surface-800/50 rounded-2xl p-8 text-center cursor-pointer active:scale-[0.99] transition shadow-inner"
          >
            <div class="w-12 h-12 rounded-2xl bg-google-blue-500/20 text-google-blue-400 flex items-center justify-center mx-auto mb-3">
              <span class="text-2xl">📷</span>
            </div>
            <p class="text-xs font-bold text-google-blue-300">Tekan di Sini untuk Buka Kamera</p>
            <p class="text-[11px] text-google-surface-300 mt-1">Gunakan kamera HP untuk ambil bukti foto</p>
          </div>

          <div v-else class="space-y-2 text-center">
            <img :src="photoPreview" alt="Bukti Foto" class="w-full max-h-56 object-contain rounded-2xl bg-black border border-google-surface-700" />
            <button
              @click="triggerCamera"
              :disabled="isSubmitting"
              class="text-xs text-google-blue-400 font-bold underline py-1 hover:text-google-blue-300 transition"
            >
              Ambil Ulang Foto ↺
            </button>
          </div>
        </div>

        <!-- Confirm Buttons (M3 Pills) -->
        <div class="flex gap-2.5 pt-2 border-t border-google-surface-700">
          <button
            @click="closeModal"
            :disabled="isSubmitting"
            class="flex-1 py-3 bg-google-surface-800 hover:bg-google-surface-700 rounded-full text-xs font-bold text-slate-300 disabled:opacity-50 transition border border-google-surface-600"
          >
            Batal
          </button>
          <button
            @click="submitUpdate"
            :disabled="isSubmitting || !photoPreview"
            class="flex-[2] py-3 rounded-full text-xs font-bold text-white shadow-m3-2 transition active:scale-98 disabled:opacity-50"
            :class="selectedItem.status === 'Jalan' ? 'bg-gradient-to-r from-google-green-600 to-teal-600 hover:from-google-green-500 hover:to-teal-500 shadow-google-green-500/25' : 'bg-gradient-to-r from-google-blue-600 via-indigo-600 to-google-blue-500 hover:from-google-blue-500 hover:to-indigo-500 shadow-google-blue-500/25'"
          >
            {{ isSubmitting ? 'Mengirim Data...' : 'Kirim Sekarang ✓' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getDriverDeliveries, sendStatusUpdate } from './services/api'
import { compressImage } from './services/imageCompressor'

const deliveries = ref([])
const activeTab = ref('siap')
const isLoading = ref(false)
const isSubmitting = ref(false)
const driverName = ref(localStorage.getItem('kpm_driver_name') || 'AANG')

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

const siapList = computed(() => deliveries.value.filter(d => d.status === 'Belum Berangkat'))
const jalanList = computed(() => deliveries.value.filter(d => d.status === 'Jalan'))
const currentList = computed(() => activeTab.value === 'siap' ? siapList.value : jalanList.value)

function saveDriverName() {
  if (driverName.value) {
    driverName.value = driverName.value.trim().toUpperCase()
    localStorage.setItem('kpm_driver_name', driverName.value)
  }
}

async function loadData() {
  isLoading.value = true
  try {
    deliveries.value = await getDriverDeliveries()
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
  const targetStatus = selectedItem.value.status === 'Jalan' ? 'Tiba' : 'Jalan'
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

