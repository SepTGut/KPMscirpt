<template>
  <div class="min-h-screen bg-slate-900 text-slate-100 pb-16">
    <!-- Header -->
    <header class="bg-slate-800 border-b border-slate-700 px-4 py-3 sticky top-0 z-20 shadow-md">
      <div class="max-w-md mx-auto flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center font-bold text-white text-base">
            🚚
          </div>
          <div>
            <h1 class="text-base font-bold text-white leading-none">Driver KPM</h1>
            <span class="text-[11px] text-slate-400">Line Feeding System</span>
          </div>
        </div>
        <button
          @click="loadData"
          :disabled="isLoading"
          class="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs font-semibold text-sky-400 active:scale-95 transition disabled:opacity-50 flex items-center gap-1.5"
        >
          <span :class="{ 'animate-spin inline-block': isLoading }">↻</span>
          <span>{{ isLoading ? 'Memuat...' : 'Segarkan' }}</span>
        </button>
      </div>
    </header>

    <!-- Main Container -->
    <main class="max-w-md mx-auto p-4 space-y-4">
      <!-- Driver Name Setting -->
      <div class="bg-slate-800/80 rounded-xl p-3 border border-slate-700 flex items-center gap-3">
        <span class="text-xs font-bold text-slate-400 shrink-0">Nama Driver:</span>
        <input
          v-model="driverName"
          @change="saveDriverName"
          type="text"
          placeholder="Ketik nama Anda (misal: AANG)"
          class="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-600 rounded-lg text-xs text-white font-bold placeholder:font-normal placeholder:text-slate-500 focus:outline-none focus:border-sky-500 uppercase"
        />
      </div>

      <!-- Tabs -->
      <div class="grid grid-cols-2 gap-2 bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-bold text-center">
        <button
          @click="activeTab = 'siap'"
          class="py-2.5 rounded-lg transition"
          :class="activeTab === 'siap' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'"
        >
          Siap Berangkat ({{ siapList.length }})
        </button>
        <button
          @click="activeTab = 'jalan'"
          class="py-2.5 rounded-lg transition"
          :class="activeTab === 'jalan' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'"
        >
          Sedang Jalan ({{ jalanList.length }})
        </button>
      </div>

      <!-- Alert Messages -->
      <div
        v-if="noticeMsg"
        class="p-3 rounded-xl text-xs font-bold flex items-center justify-between"
        :class="noticeType === 'success' ? 'bg-emerald-900/80 text-emerald-200 border border-emerald-600' : 'bg-rose-900/80 text-rose-200 border border-rose-600'"
      >
        <span>{{ noticeMsg }}</span>
        <button @click="noticeMsg = ''" class="text-lg leading-none ml-2">✕</button>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading && !deliveries.length" class="text-center py-12 text-slate-400 text-xs">
        <p class="text-2xl mb-2">⏳</p>
        Memuat data tugas pengiriman...
      </div>

      <!-- Empty State -->
      <div v-else-if="!currentList.length" class="text-center py-12 bg-slate-800/40 rounded-2xl border border-slate-700/60 p-6 text-slate-400">
        <p class="text-3xl mb-2">📦</p>
        <p class="text-sm font-bold text-slate-300">Tidak ada KPM pada tab ini</p>
        <p class="text-xs text-slate-500 mt-1">
          {{ activeTab === 'siap' ? 'Belum ada KPM yang siap berangkat.' : 'Tidak ada KPM yang sedang dalam perjalanan.' }}
        </p>
      </div>

      <!-- Delivery List -->
      <div v-else class="space-y-3">
        <div
          v-for="item in currentList"
          :key="item.nomor || item.kpmId"
          class="bg-slate-800 border border-slate-700 rounded-xl p-3.5 shadow space-y-3"
        >
          <!-- Header Card -->
          <div class="flex items-start justify-between gap-2">
            <div>
              <span class="text-xs font-mono font-bold text-sky-400 tracking-wider">
                {{ item.nomor || item.kpmId }}
              </span>
              <div class="text-xs font-bold text-white mt-0.5">{{ item.proyek || 'Line Feeding' }}</div>
            </div>
            <span
              class="px-2 py-0.5 rounded text-[11px] font-bold"
              :class="item.status === 'Jalan' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'"
            >
              {{ item.status }}
            </span>
          </div>

          <!-- Route Info -->
          <div class="bg-slate-900 p-2.5 rounded-lg border border-slate-700/50 flex items-center justify-between text-xs font-semibold">
            <div class="text-slate-300 truncate max-w-[45%]">
              <div class="text-[10px] text-slate-500 font-bold uppercase">Asal</div>
              {{ item.wsAwal || '-' }}
            </div>
            <span class="text-sky-400 font-bold">➔</span>
            <div class="text-right text-emerald-400 truncate max-w-[45%]">
              <div class="text-[10px] text-slate-500 font-bold uppercase">Tujuan</div>
              {{ item.wsTujuan || '-' }}
            </div>
          </div>

          <!-- Items Info -->
          <div class="text-xs text-slate-300">
            <span class="text-slate-400">Material:</span>
            <span class="font-semibold text-white ml-1">
              {{ item.items?.map(i => i.spek || i.deskripsi).join(', ') || item.spek || item.deskripsi || 'Material KPM' }}
            </span>
          </div>

          <!-- Action Button -->
          <button
            @click="openModalFor(item)"
            class="w-full py-3 rounded-lg font-bold text-xs text-white shadow-md active:scale-98 transition flex items-center justify-center gap-2"
            :class="item.status === 'Jalan' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-sky-600 hover:bg-sky-500'"
          >
            <span>{{ item.status === 'Jalan' ? '🏁 Konfirmasi Tiba (Ambil Foto)' : '🚚 Mulai Jalan (Ambil Foto)' }}</span>
          </button>
        </div>
      </div>
    </main>

    <!-- Modal Ambil Foto & Konfirmasi -->
    <div v-if="selectedItem" class="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div class="bg-slate-800 border border-slate-700 w-full max-w-md rounded-t-2xl sm:rounded-2xl p-4 space-y-4 max-h-[90vh] overflow-y-auto">
        <!-- Modal Header -->
        <div class="flex items-center justify-between pb-2 border-b border-slate-700">
          <div>
            <span class="text-xs font-mono font-bold text-sky-400">{{ selectedItem.nomor || selectedItem.kpmId }}</span>
            <h3 class="text-sm font-bold text-white">
              {{ selectedItem.status === 'Jalan' ? 'Upload Bukti Tiba' : 'Upload Bukti Berangkat' }}
            </h3>
          </div>
          <button @click="closeModal" :disabled="isSubmitting" class="text-slate-400 hover:text-white text-lg font-bold p-1">✕</button>
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

        <!-- Camera Area -->
        <div class="space-y-2">
          <div
            v-if="!photoPreview"
            @click="triggerCamera"
            class="border-2 border-dashed border-sky-500/50 bg-slate-900 rounded-xl p-8 text-center cursor-pointer active:bg-slate-950"
          >
            <p class="text-4xl mb-2">📷</p>
            <p class="text-xs font-bold text-sky-400">Tekan di Sini untuk Buka Kamera</p>
            <p class="text-[11px] text-slate-500 mt-1">Gunakan kamera HP untuk ambil bukti foto</p>
          </div>

          <div v-else class="space-y-2 text-center">
            <img :src="photoPreview" alt="Bukti Foto" class="w-full max-h-56 object-contain rounded-xl bg-black border border-slate-700" />
            <button
              @click="triggerCamera"
              :disabled="isSubmitting"
              class="text-xs text-sky-400 font-bold underline py-1"
            >
              Ambil Ulang Foto ↺
            </button>
          </div>
        </div>

        <!-- Confirm Buttons -->
        <div class="flex gap-2 pt-2 border-t border-slate-700">
          <button
            @click="closeModal"
            :disabled="isSubmitting"
            class="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold text-slate-300 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            @click="submitUpdate"
            :disabled="isSubmitting || !photoPreview"
            class="flex-[2] py-2.5 rounded-lg text-xs font-bold text-white shadow transition disabled:opacity-50"
            :class="selectedItem.status === 'Jalan' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-sky-600 hover:bg-sky-500'"
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
