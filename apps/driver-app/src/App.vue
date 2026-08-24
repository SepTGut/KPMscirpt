<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-20">
    <!-- Navbar Header -->
    <Navbar
      :is-online="isOnline"
      :pending-count="pendingQueue.length"
      :is-refreshing="isLoading"
      @open-scanner="isScannerOpen = true"
      @open-queue="isQueueOpen = true"
      @refresh="loadData(true)"
    />

    <!-- Main Content Body -->
    <main class="flex-1 max-w-md w-full mx-auto px-4 py-4 space-y-4">
      <!-- Search and Filter Bar -->
      <div class="relative">
        <Search class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari Nomor KPM / Proyek / Workshop..."
          class="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition shadow-inner"
        />
        <button
          v-if="searchQuery"
          @click="searchQuery = ''"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- Category Filter Tabs -->
      <div class="grid grid-cols-3 gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs font-semibold text-center">
        <button
          @click="activeTab = 'siap'"
          class="py-2 rounded-lg transition"
          :class="activeTab === 'siap' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'"
        >
          Siap ({{ siapCount }})
        </button>
        <button
          @click="activeTab = 'jalan'"
          class="py-2 rounded-lg transition"
          :class="activeTab === 'jalan' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'"
        >
          Jalan ({{ jalanCount }})
        </button>
        <button
          @click="activeTab = 'semua'"
          class="py-2 rounded-lg transition"
          :class="activeTab === 'semua' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'"
        >
          Semua ({{ deliveries.length }})
        </button>
      </div>

      <!-- Toast Notification Alert -->
      <div
        v-if="toastMessage"
        class="p-3 rounded-xl text-xs font-semibold flex items-center justify-between shadow-lg transition"
        :class="toastType === 'success' ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-200 border border-rose-500/40'"
      >
        <div class="flex items-center gap-2">
          <CheckCircle2 v-if="toastType === 'success'" class="w-4 h-4 shrink-0 text-emerald-400" />
          <AlertCircle v-else class="w-4 h-4 shrink-0 text-rose-400" />
          <span>{{ toastMessage }}</span>
        </div>
        <button @click="toastMessage = ''" class="text-slate-400 hover:text-white">
          <X class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading && !deliveries.length" class="py-16 text-center text-slate-500 space-y-3">
        <Loader2 class="w-8 h-8 mx-auto text-sky-400 animate-spin" />
        <p class="text-xs">Memuat tugas pengiriman...</p>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="!filteredDeliveries.length"
        class="py-16 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800/80 p-6 space-y-3"
      >
        <div class="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
          <Inbox class="w-6 h-6" />
        </div>
        <h4 class="text-sm font-bold text-slate-300">Tidak ada pengiriman</h4>
        <p class="text-xs text-slate-500 max-w-xs mx-auto">
          {{ searchQuery ? 'Tidak ada KPM yang cocok dengan pencarian Anda.' : 'Semua KPM telah selesai diantar atau belum dibuat oleh Admin.' }}
        </p>
      </div>

      <!-- Deliveries Card List -->
      <div v-else class="space-y-3">
        <DeliveryCard
          v-for="item in filteredDeliveries"
          :key="item.nomor || item.kpmId"
          :delivery="item"
          @action="openCameraForDelivery"
        />
      </div>
    </main>

    <!-- Floating Action Button: Quick Scan QR -->
    <div class="fixed bottom-5 left-0 right-0 max-w-md mx-auto px-4 pointer-events-none flex justify-center z-20">
      <button
        @click="isScannerOpen = true"
        class="pointer-events-auto flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-sky-600 to-blue-600 text-white font-bold text-xs shadow-xl shadow-sky-600/30 hover:scale-105 active:scale-95 transition"
      >
        <QrCode class="w-4 h-4" />
        <span>Scan QR KPM Fisik</span>
      </button>
    </div>

    <!-- Modals -->
    <CameraModal
      :is-open="isCameraOpen"
      :target-delivery="selectedDelivery"
      :is-submitting="isSubmitting"
      :error-message="submitError"
      @close="isCameraOpen = false"
      @submit="handleStatusSubmit"
    />

    <QrScannerModal
      :is-open="isScannerOpen"
      @close="isScannerOpen = false"
      @scanned="handleQrScanned"
    />

    <OfflineQueueModal
      :is-open="isQueueOpen"
      :items="pendingQueue"
      :is-syncing="isSyncing"
      @close="isQueueOpen = false"
      @sync="handleManualSync"
      @cleared="refreshQueue"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { Search, X, Loader2, Inbox, QrCode, CheckCircle2, AlertCircle } from 'lucide-vue-next'
import Navbar from './components/Navbar.vue'
import DeliveryCard from './components/DeliveryCard.vue'
import CameraModal from './components/CameraModal.vue'
import QrScannerModal from './components/QrScannerModal.vue'
import OfflineQueueModal from './components/OfflineQueueModal.vue'
import { fetchDeliveries, submitStatusUpdate, syncOfflineQueue } from './services/api'
import { getPendingUpdates } from './services/offlineQueue'

// State
const isOnline = ref(navigator.onLine)
const deliveries = ref([])
const pendingQueue = ref([])
const isLoading = ref(false)
const isSubmitting = ref(false)
const isSyncing = ref(false)
const searchQuery = ref('')
const activeTab = ref('siap') // 'siap' | 'jalan' | 'semua'

// Modals
const isCameraOpen = ref(false)
const isScannerOpen = ref(false)
const isQueueOpen = ref(false)
const selectedDelivery = ref(null)
const submitError = ref('')

// Toasts
const toastMessage = ref('')
const toastType = ref('success')

function showToast(msg, type = 'success') {
  toastMessage.value = msg
  toastType.value = type
  setTimeout(() => {
    if (toastMessage.value === msg) toastMessage.value = ''
  }, 4500)
}

// Counts
const siapCount = computed(() => deliveries.value.filter(d => d.status === 'Belum Berangkat').length)
const jalanCount = computed(() => deliveries.value.filter(d => d.status === 'Jalan').length)

// Filtered List
const filteredDeliveries = computed(() => {
  let list = deliveries.value

  if (activeTab.value === 'siap') {
    list = list.filter(d => d.status === 'Belum Berangkat')
  } else if (activeTab.value === 'jalan') {
    list = list.filter(d => d.status === 'Jalan')
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter(d => {
      const no = (d.nomor || d.kpmId || '').toLowerCase()
      const proyek = (d.proyek || '').toLowerCase()
      const wsAwal = (d.wsAwal || '').toLowerCase()
      const wsTujuan = (d.wsTujuan || '').toLowerCase()
      const pic = (d.pic || '').toLowerCase()
      return no.includes(q) || proyek.includes(q) || wsAwal.includes(q) || wsTujuan.includes(q) || pic.includes(q)
    })
  }

  return list
})

async function loadData(bypass = false) {
  isLoading.value = true
  try {
    const data = await fetchDeliveries(bypass)
    deliveries.value = data
  } catch (err) {
    showToast(err.message || 'Gagal mengambil data KPM.', 'error')
  } finally {
    isLoading.value = false
    await refreshQueue()
  }
}

async function refreshQueue() {
  try {
    pendingQueue.value = await getPendingUpdates()
  } catch (e) {}
}

function openCameraForDelivery(delivery) {
  selectedDelivery.value = delivery
  submitError.value = ''
  isCameraOpen.value = true
}

async function handleStatusSubmit(payload) {
  isSubmitting.value = true
  submitError.value = ''
  try {
    const res = await submitStatusUpdate(payload)
    isCameraOpen.value = false
    if (res?.offlineQueued) {
      showToast('Status tersimpan di HP. Akan di-sync saat online.', 'success')
    } else {
      showToast(`Status KPM ${payload.nomorKPM} berhasil diperbarui ke '${payload.statusKPM}'.`, 'success')
    }
    await loadData(true)
  } catch (err) {
    submitError.value = err.message || 'Gagal mengirim status KPM.'
  } finally {
    isSubmitting.value = false
    await refreshQueue()
  }
}

function handleQrScanned(decodedText) {
  const clean = decodedText.trim()
  searchQuery.value = clean
  activeTab.value = 'semua'

  // Look for match
  const match = deliveries.value.find(d => {
    const no = (d.nomor || d.kpmId || '').trim()
    return no.toLowerCase() === clean.toLowerCase()
  })

  if (match) {
    openCameraForDelivery(match)
  } else {
    showToast(`KPM ${clean} ditemukan dalam pencarian.`, 'success')
  }
}

async function handleManualSync() {
  if (!navigator.onLine) {
    showToast('HP Anda sedang offline. Tunggu hingga koneksi kembali.', 'error')
    return
  }
  isSyncing.value = true
  try {
    const { synced, failed } = await syncOfflineQueue()
    if (synced > 0) {
      showToast(`Berhasil mengunggah ${synced} antrean offline!`, 'success')
      await loadData(true)
    }
    if (failed > 0) {
      showToast(`${failed} antrean gagal di-sync.`, 'error')
    }
  } finally {
    isSyncing.value = false
    await refreshQueue()
  }
}

// Network state listeners
function onOnline() {
  isOnline.value = true
  showToast('Koneksi internet kembali online.', 'success')
  handleManualSync()
}

function onOffline() {
  isOnline.value = false
  showToast('Anda sedang offline. Mode antrean lokal aktif.', 'error')
}

onMounted(() => {
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  loadData()
  refreshQueue()
})

onBeforeUnmount(() => {
  window.removeEventListener('online', onOnline)
  window.removeEventListener('offline', onOffline)
})
</script>
