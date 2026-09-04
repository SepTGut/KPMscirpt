<script setup>
import { ref, computed, onUnmounted } from 'vue'
import {
  openWorkshopNavigation,
  trackingState,
  getCurrentCoordinates
} from '../services/trackingService'
import { compressImage } from '../composables/useGps'
import { requestApi } from '../composables/useApi'

const api = (action, opts) => requestApi(action, opts, { mode: 'user' })

const props = defineProps({
  deliveries: { type: Array, required: true },
  selectedDelivery: { type: Object, default: null },
  driverName: { type: String, default: '' },
  busy: { type: Boolean, default: false }
})

const emit = defineEmits([
  'select-delivery',
  'refresh-deliveries',
  'update-driver-name',
  'submit-status-update'
])

const photoFile = ref(null)
const updateForm = ref({ statusKPM: '' })

// QR Modal & Staging State for "Tiba" Confirmation
const stagingBusy = ref(false)
const showQrModal = ref(false)
const qrTargetUrl = ref('')
const isConfirmed = ref(false)
const confirmedRecipientName = ref('')
const copySuccess = ref(false)
let pollTimer = null

const qrImageUrl = computed(() => {
  if (!qrTargetUrl.value) return ''
  return `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(qrTargetUrl.value)}`
})

function onPhoto(event) {
  photoFile.value = event.target.files?.[0] || null
}

function handleSelectDelivery(item) {
  emit('select-delivery', item)
  updateForm.value.statusKPM = item.nextAction || ''
  photoFile.value = null
}

function handleDriverNameInput(e) {
  emit('update-driver-name', e.target.value)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function startPollingConfirmation(nomorKPM) {
  stopPolling()
  pollTimer = setInterval(async () => {
    try {
      const data = await api('getMonitoring', { method: 'GET', body: { bypassCache: 'true' } })
      if (Array.isArray(data)) {
        const found = data.find(k => k.nomor === nomorKPM || k.kpmId === nomorKPM)
        if (found && (found.status === 'Tiba' || found.status === 'Selesai' || found.penerima)) {
          stopPolling()
          isConfirmed.value = true
          confirmedRecipientName.value = found.penerima || 'Penerima Terdaftar'
          setTimeout(() => {
            closeQrModal()
            emit('refresh-deliveries')
          }, 2500)
        }
      }
    } catch {}
  }, 3000)
}

async function handleStageArrivalQr() {
  if (!props.selectedDelivery) return
  if (!photoFile.value) {
    alert('Foto bukti kedatangan wajib dilampirkan sebelum membuka QR Code penerima.')
    return
  }

  stagingBusy.value = true
  try {
    const kpmNomor = props.selectedDelivery.nomor || props.selectedDelivery.kpmId
    const coords = await getCurrentCoordinates().catch(() => null)
    const fotoData = await compressImage(photoFile.value)

    await api('stageArrival', {
      body: {
        nomorKPM: kpmNomor,
        fotoData: fotoData,
        driver: props.driverName || '',
        namaPIC: props.selectedDelivery.pic || '',
        lokasiWorkshop: props.selectedDelivery.lokasiTiba || props.selectedDelivery.wsTujuan || '',
        latitude: coords?.latitude || '',
        longitude: coords?.longitude || '',
      }
    })

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://combined-app-eight.vercel.app'
    qrTargetUrl.value = `${origin}/kpm/confirm?kpm=${encodeURIComponent(kpmNomor)}`
    isConfirmed.value = false
    confirmedRecipientName.value = ''
    showQrModal.value = true

    // Start auto-poll to detect recipient confirmation
    startPollingConfirmation(kpmNomor)
  } catch (err) {
    alert('Gagal menyimpan foto bukti: ' + (err.message || String(err)))
  } finally {
    stagingBusy.value = false
  }
}

function closeQrModal() {
  stopPolling()
  showQrModal.value = false
}

function copyConfirmationLink() {
  if (!qrTargetUrl.value || typeof navigator === 'undefined') return
  navigator.clipboard.writeText(qrTargetUrl.value).then(() => {
    copySuccess.value = true
    setTimeout(() => { copySuccess.value = false }, 2500)
  })
}

function handleSubmit() {
  if (!props.selectedDelivery) return
  const actionTarget = updateForm.value.statusKPM || props.selectedDelivery.nextAction

  // If next status is Tiba, initiate the photo staging & QR Code handover workflow
  if (actionTarget === 'Tiba') {
    handleStageArrivalQr()
    return
  }

  // Otherwise (Berangkat / Jalan), standard direct update
  emit('submit-status-update', {
    statusKPM: actionTarget,
    photoFile: photoFile.value
  })
}

onUnmounted(() => {
  stopPolling()
})
</script>

<template>
  <section>
    <div class="mb-4">
      <h1 class="text-xl font-bold text-google-surface-800">Portal Pembaruan Personel</h1>
      <p class="text-xs text-google-surface-500 mt-0.5">Pilih KPM yang ditugaskan, lampirkan foto bukti, lalu kirim status perjalanan.</p>
    </div>

    <!-- GPS Live Status Banner -->
    <div class="mb-5 flex flex-wrap items-center justify-between gap-2 p-3.5 bg-white rounded-2xl border border-google-surface-200 shadow-sm text-xs">
      <div class="flex items-center gap-2.5">
        <span class="relative flex h-3 w-3">
          <span v-if="trackingState.isTracking" class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-3 w-3" :class="trackingState.isTracking ? 'bg-emerald-500' : 'bg-slate-400'"></span>
        </span>
        <div>
          <span class="font-bold text-google-surface-800">
            {{ trackingState.isTracking ? '📡 GPS Live Tracking Aktif' : '📍 GPS Siap (Standby)' }}
          </span>
          <span v-if="trackingState.activeKpmCount" class="text-slate-500 font-medium ml-1">
            ({{ trackingState.activeKpmCount }} KPM berjalan)
          </span>
        </div>
      </div>
      <div v-if="trackingState.latitude" class="font-mono text-[11px] text-google-blue-700 font-semibold bg-google-blue-50 px-2.5 py-1 rounded-lg border border-google-blue-100">
        📍 {{ trackingState.latitude.toFixed(5) }}, {{ trackingState.longitude.toFixed(5) }}
        <span v-if="trackingState.accuracy" class="text-slate-500 font-normal"> (±{{ trackingState.accuracy }}m)</span>
      </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <!-- Deliveries List -->
      <div class="panel">
        <div class="flex items-center justify-between pb-3 border-b border-google-surface-200">
          <h3 class="font-bold text-sm text-google-surface-800">Daftar KPM Tersedia</h3>
          <button class="btn-secondary !py-1 !px-3 !text-xs !font-bold" :disabled="busy" @click="$emit('refresh-deliveries')">
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
            @click="handleSelectDelivery(item)"
          >
            <div class="flex justify-between items-start gap-2">
              <div>
                <span class="text-xs font-mono font-bold text-google-blue-700 uppercase">{{ item.nomor }}</span>
                <p class="text-xs font-bold text-google-surface-800 mt-0.5">{{ item.proyek || 'Line Feeding' }}</p>
                <p class="text-[11px] text-google-surface-500">{{ item.lokasi || `${item.lokasiBerangkat || '-'} ➔ ${item.lokasiTiba || '-'}` }}</p>
              </div>
              <span class="chip !text-[10px] !font-bold bg-google-blue-100 text-google-blue-800 border border-google-blue-200">
                ➔ {{ item.nextAction }}
              </span>
            </div>
          </button>
        </div>
      </div>

      <!-- Update Form -->
      <form class="panel space-y-5" @submit.prevent="handleSubmit">
        <div v-if="!selectedDelivery" class="py-16 text-center text-xs text-google-surface-400">
          <p class="text-3xl mb-2">👈</p>
          Pilih salah satu KPM dari daftar di sebelah kiri untuk melihat rincian dan mengunggah foto.
        </div>

        <template v-else>
          <div class="border-b border-google-surface-200 pb-3">
            <span class="text-xs font-mono font-bold text-google-blue-700 uppercase">{{ selectedDelivery.nomor }}</span>
            <h3 class="text-base font-bold text-google-surface-900 mt-0.5">{{ selectedDelivery.proyek }}</h3>
            <p class="text-xs text-google-surface-500">{{ selectedDelivery.lokasi || `${selectedDelivery.lokasiBerangkat || '-'} ➔ ${selectedDelivery.lokasiTiba || '-'}` }}</p>
          </div>

          <!-- 1-Click GMaps Navigation Button -->
          <div>
            <button
              type="button"
              class="w-full py-2.5 px-3 rounded-xl bg-google-blue-50 hover:bg-google-blue-100 text-google-blue-700 text-xs font-bold flex items-center justify-center gap-2 border border-google-blue-200 transition shadow-sm"
              @click="openWorkshopNavigation(selectedDelivery.lokasiTiba || selectedDelivery.wsTujuan)"
            >
              <span>🗺️</span>
              <span>Buka Navigasi Rute di Google Maps (Ke {{ selectedDelivery.lokasiTiba || selectedDelivery.wsTujuan || 'Tujuan' }})</span>
            </button>
          </div>

          <div class="rounded-2xl bg-google-yellow-50/70 border border-google-yellow-200 p-4 text-xs">
            <p class="font-bold text-google-yellow-900 mb-2">📦 Material Bawaan:</p>
            <div v-for="material in selectedDelivery.daftarBarang" :key="`${material.nama}-${material.qty}`" class="flex justify-between py-1 border-b border-google-yellow-200/50 last:border-0 text-google-yellow-950">
              <span>{{ material.nama }}</span>
              <strong class="font-mono font-bold">{{ material.qty }} {{ material.uom }}</strong>
            </div>
          </div>

          <label class="block">
            <span class="label">Nama Pengemudi / Driver</span>
            <input :value="driverName" @input="handleDriverNameInput" class="field bg-white" placeholder="Contoh: PAK BUDI" />
          </label>

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
            <button
              class="btn-success w-full !py-3.5 !text-sm !font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition active:scale-[0.98]"
              :disabled="busy || stagingBusy"
            >
              <span v-if="stagingBusy || busy" class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span v-if="updateForm.statusKPM === 'Tiba'">
                {{ stagingBusy ? 'Menyimpan Foto & Menyiapkan QR...' : '📷 Ambil Foto & Tampilkan QR Penerima ➔' }}
              </span>
              <span v-else>
                {{ busy ? 'Mengunggah Data & Foto...' : 'Simpan Pembaruan Status ✓' }}
              </span>
            </button>
          </div>
        </template>
      </form>
    </div>

    <!-- Recipient QR Code Handover Modal -->
    <div
      v-if="showQrModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn"
    >
      <div class="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center relative overflow-hidden">
        <!-- Accent bar -->
        <div class="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-google-blue-500 via-google-yellow-500 to-google-green-500"></div>

        <!-- Success Animation if Recipient Confirmed -->
        <div v-if="isConfirmed" class="py-6 animate-fadeIn">
          <div class="w-16 h-16 mx-auto rounded-full bg-emerald-100 border-2 border-emerald-500 text-emerald-600 flex items-center justify-center text-3xl font-black mb-3">
            ✓
          </div>
          <h3 class="text-lg font-black text-slate-900">Barang Resmi Diterima!</h3>
          <p class="text-xs text-slate-500 mt-1">Dikonfirmasi oleh <strong class="text-slate-900">{{ confirmedRecipientName }}</strong>.</p>
          <p class="text-[11px] text-emerald-600 font-bold mt-3">Menutup jendela dan memperbarui daftar...</p>
        </div>

        <!-- Normal Scanning State -->
        <div v-else>
          <div class="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div class="text-left">
              <span class="text-[10px] font-bold uppercase tracking-wider text-google-blue-600 block">Serah Terima Material</span>
              <h3 class="text-sm font-black text-slate-900 font-mono">{{ selectedDelivery?.nomor }}</h3>
            </div>
            <button
              type="button"
              class="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold"
              @click="closeQrModal"
            >
              ✕
            </button>
          </div>

          <p class="text-xs text-slate-600 mb-4">
            Minta <strong>Penerima Barang</strong> men-scan QR Code di bawah dengan kamera ponsel mereka untuk mengonfirmasi penerimaan:
          </p>

          <!-- QR Code Image -->
          <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 inline-block shadow-inner mb-3">
            <img
              :src="qrImageUrl"
              alt="QR Code Konfirmasi Penerima"
              class="w-56 h-56 mx-auto rounded-xl shadow-xs"
            />
          </div>

          <!-- Live Waiting Indicator -->
          <div class="flex items-center justify-center gap-2 text-xs font-semibold text-google-blue-700 bg-google-blue-50 py-2 px-3 rounded-xl mb-4">
            <span class="relative flex h-2.5 w-2.5">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-google-blue-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-google-blue-600"></span>
            </span>
            <span>Menunggu scan & konfirmasi penerima...</span>
          </div>

          <!-- Actions: Copy Link & Close -->
          <div class="space-y-2">
            <button
              type="button"
              class="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition"
              @click="copyConfirmationLink"
            >
              <span>📋</span>
              <span>{{ copySuccess ? '✓ Link Berhasil Disalin!' : 'Salin Tautan Konfirmasi' }}</span>
            </button>

            <a
              :href="qrTargetUrl"
              target="_blank"
              class="block w-full py-2 text-center text-[11px] font-bold text-google-blue-600 hover:underline"
            >
              Buka Halaman Konfirmasi di Tab Baru ↗
            </a>

            <button
              type="button"
              class="w-full py-2 text-center text-xs font-bold text-slate-400 hover:text-slate-600 transition"
              @click="closeQrModal"
            >
              Tutup Jendela
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
