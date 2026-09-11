<script setup>
import { ref, computed, onUnmounted } from 'vue'
import Icon from './Icon.vue'
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
  busy: { type: Boolean, default: false },
  isIT: { type: Boolean, default: false }
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

// Departure Staging & Checker Waiting State for "Jalan" Confirmation
const departureStagingBusy = ref(false)
const showDepartureModal = ref(false)
const departureConfirmed = ref(false)
const departureCheckerName = ref('')
let departurePollTimer = null

// Batch Departure State
const selectedKpmNumbers = ref([])
const stagedBatchKpmList = ref([])

const readyToDepartDeliveries = computed(() => {
  return props.deliveries.filter(d => d.nextAction === 'Jalan' || d.nextAction === 'Berangkat')
})

const isBatchMode = computed(() => {
  return selectedKpmNumbers.value.length > 1
})

const selectedBatchDeliveries = computed(() => {
  return props.deliveries.filter(d => selectedKpmNumbers.value.includes(d.nomor || d.kpmId))
})

function toggleKpmSelection(kpmNum) {
  const num = String(kpmNum || '').trim()
  if (!num) return
  const idx = selectedKpmNumbers.value.indexOf(num)
  if (idx === -1) {
    selectedKpmNumbers.value.push(num)
  } else {
    selectedKpmNumbers.value.splice(idx, 1)
  }
}

function selectAllReadyToDepart() {
  const readyNums = readyToDepartDeliveries.value.map(d => d.nomor || d.kpmId).filter(Boolean)
  selectedKpmNumbers.value = Array.from(new Set(readyNums))
}

function clearSelection() {
  selectedKpmNumbers.value = []
}

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
  if (selectedKpmNumbers.value.length <= 1) {
    if (item.nextAction === 'Jalan' || item.nextAction === 'Berangkat') {
      selectedKpmNumbers.value = [item.nomor || item.kpmId]
    } else {
      selectedKpmNumbers.value = []
    }
  }
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
      const res = await api('checkArrivalStatus', {
        method: 'GET',
        body: { nomorKPM: nomorKPM, refresh: 'true' }
      })
      if (res && res.isConfirmed) {
        stopPolling()
        isConfirmed.value = true
        confirmedRecipientName.value = res.penerima || 'Penerima'
        setTimeout(() => {
          closeQrModal()
          emit('refresh-deliveries')
        }, 2500)
      }
    } catch {}
  }, 2000)
}

async function handleStageArrivalQr() {
  if (!props.selectedDelivery) return
  stagingBusy.value = true
  try {
    const kpmNomor = props.selectedDelivery.nomor || props.selectedDelivery.kpmId
    const coords = await getCurrentCoordinates().catch(() => null)
    let fotoData = ''
    if (photoFile.value) {
      try {
        fotoData = await compressImage(photoFile.value)
      } catch (err) {
        console.warn('Gagal mengompres foto kedatangan:', err)
      }
    }

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

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://lnfd.vercel.app'
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

function stopDeparturePolling() {
  if (departurePollTimer) {
    clearInterval(departurePollTimer)
    departurePollTimer = null
  }
}

function closeDepartureModal() {
  stopDeparturePolling()
  showDepartureModal.value = false
}

function startPollingDepartureConfirmation(nomorKPM) {
  stopDeparturePolling()
  departurePollTimer = setInterval(async () => {
    try {
      const res = await api('checkDepartureStatus', {
        method: 'GET',
        body: { nomorKPM: nomorKPM, refresh: 'true' }
      })
      if (res) {
        if (res.isConfirmed) {
          stopDeparturePolling()
          departureConfirmed.value = true
          departureCheckerName.value = res.checker || 'Checker Pos Gerbang'
          setTimeout(() => {
            closeDepartureModal()
            selectedKpmNumbers.value = []
            stagedBatchKpmList.value = []
            emit('refresh-deliveries')
          }, 2500)
        } else if (res.isRejected) {
          stopDeparturePolling()
          closeDepartureModal()
          alert(`⚠️ Keberangkatan Ditolak oleh Checker (${res.checker || 'Pos Gerbang'}).\n\nAlasan: ${res.alasan || 'Pemeriksaan fisik tidak sesuai'}.\n\nSilakan periksa kembali muatan Anda bersama tim gudang/produksi.`)
          selectedKpmNumbers.value = []
          stagedBatchKpmList.value = []
          emit('refresh-deliveries')
        }
      }
    } catch {}
  }, 2000)
}

async function handleStageDepartureGate() {
  if (!props.selectedDelivery) return
  departureStagingBusy.value = true
  try {
    const kpmNomor = props.selectedDelivery.nomor || props.selectedDelivery.kpmId
    const coords = await getCurrentCoordinates().catch(() => null)
    let fotoData = ''
    if (photoFile.value) {
      try {
        fotoData = await compressImage(photoFile.value)
      } catch (err) {
        console.warn('Gagal mengompres foto keberangkatan:', err)
      }
    }

    await api('stageDeparture', {
      body: {
        nomorKPM: kpmNomor,
        fotoData: fotoData,
        driver: props.driverName || '',
        namaPIC: props.selectedDelivery.pic || '',
        lokasiWorkshop: props.selectedDelivery.lokasi || `${props.selectedDelivery.lokasiBerangkat || ''} ➔ ${props.selectedDelivery.lokasiTiba || ''}`,
        latitude: coords?.latitude || '',
        longitude: coords?.longitude || '',
      }
    })

    stagedBatchKpmList.value = [kpmNomor]
    departureConfirmed.value = false
    departureCheckerName.value = ''
    showDepartureModal.value = true

    // Start auto-poll to detect Checker authorization
    startPollingDepartureConfirmation(kpmNomor)
  } catch (err) {
    alert('Gagal menginisialisasi keberangkatan: ' + (err.message || String(err)))
  } finally {
    departureStagingBusy.value = false
  }
}

async function handleStageDepartureGateBatch() {
  if (!selectedKpmNumbers.value.length) return
  departureStagingBusy.value = true
  try {
    const kpmList = [...selectedKpmNumbers.value]
    const coords = await getCurrentCoordinates().catch(() => null)
    let fotoData = ''
    if (photoFile.value) {
      try {
        fotoData = await compressImage(photoFile.value)
      } catch (err) {
        console.warn('Gagal mengompres foto keberangkatan batch:', err)
      }
    }

    const routes = selectedBatchDeliveries.value.map(d => d.lokasi || `${d.lokasiBerangkat || ''} ➔ ${d.lokasiTiba || ''}`).filter(Boolean)
    const combinedRoute = Array.from(new Set(routes)).join(' | ')

    await api('stageDeparture', {
      body: {
        nomorKPMs: kpmList,
        fotoData: fotoData,
        driver: props.driverName || '',
        namaPIC: selectedBatchDeliveries.value[0]?.pic || '',
        lokasiWorkshop: combinedRoute,
        latitude: coords?.latitude || '',
        longitude: coords?.longitude || '',
      }
    })

    stagedBatchKpmList.value = kpmList
    departureConfirmed.value = false
    departureCheckerName.value = ''
    showDepartureModal.value = true

    // Start auto-poll using the first KPM in batch
    startPollingDepartureConfirmation(kpmList[0])
  } catch (err) {
    alert('Gagal menginisialisasi keberangkatan batch: ' + (err.message || String(err)))
  } finally {
    departureStagingBusy.value = false
  }
}

function handleSubmit() {
  if (isBatchMode.value) {
    handleStageDepartureGateBatch()
    return
  }

  if (!props.selectedDelivery) return
  const actionTarget = updateForm.value.statusKPM || props.selectedDelivery.nextAction

  // If next status is Tiba, initiate the photo staging & QR Code handover workflow (Photo mandatory)
  if (actionTarget === 'Tiba') {
    handleStageArrivalQr()
    return
  }

  // If next status is Jalan / Berangkat, initiate two-stage departure with Checker (Photo optional)
  if (actionTarget === 'Jalan' || actionTarget === 'Berangkat') {
    handleStageDepartureGate()
    return
  }

  // Otherwise, standard direct update
  emit('submit-status-update', {
    statusKPM: actionTarget,
    photoFile: photoFile.value
  })
}

onUnmounted(() => {
  stopPolling()
  stopDeparturePolling()
})
</script>

<template>
  <section>
    <div class="mb-4">
      <h1 class="text-xl font-bold text-google-surface-800 dark:text-slate-100">Portal Pembaruan Personel Driver</h1>
      <p class="text-xs text-google-surface-500 dark:text-slate-400 mt-0.5">Pilih KPM yang ditugaskan, lampirkan foto bukti, lalu kirim status perjalanan.</p>
    </div>

    <!-- GPS Live Status Banner -->
    <div class="mb-5 flex flex-wrap items-center justify-between gap-2 p-3.5 bg-white dark:bg-slate-900/90 rounded-2xl border border-google-surface-200/90 dark:border-slate-800 shadow-sm text-xs">
      <div class="flex items-center gap-2.5">
        <span class="relative flex h-3 w-3">
          <span v-if="trackingState.isTracking" class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-3 w-3" :class="trackingState.isTracking ? 'bg-emerald-500' : 'bg-slate-400'"></span>
        </span>
        <div class="flex items-center gap-1.5">
          <Icon :name="trackingState.isTracking ? 'lightning' : 'location'" className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span class="font-bold text-google-surface-800 dark:text-slate-200">
            {{ trackingState.isTracking ? 'GPS Live Tracking Aktif' : 'GPS Siaga (Standby)' }}
          </span>
          <span v-if="trackingState.activeKpmCount" class="text-slate-500 dark:text-slate-400 font-medium ml-1">
            ({{ trackingState.activeKpmCount }} KPM berjalan)
          </span>
        </div>
      </div>
      <div v-if="trackingState.latitude" class="font-mono text-[11px] text-google-blue-700 dark:text-blue-300 font-semibold bg-google-blue-50 dark:bg-blue-950/50 px-2.5 py-1 rounded-lg border border-google-blue-100 dark:border-blue-800/60 flex items-center gap-1">
        <Icon name="location" className="w-3 h-3 text-google-blue-600 dark:text-blue-400" />
        <span>{{ trackingState.latitude.toFixed(5) }}, {{ trackingState.longitude.toFixed(5) }}</span>
        <span v-if="trackingState.accuracy" class="text-slate-500 dark:text-slate-400 font-normal"> (±{{ trackingState.accuracy }}m)</span>
      </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <!-- Deliveries List -->
      <div class="panel">
        <div class="flex items-center justify-between pb-3 border-b border-google-surface-200/90 dark:border-slate-800">
          <div>
            <h3 class="font-bold text-sm text-google-surface-800 dark:text-slate-100 flex items-center gap-1.5">
              <Icon name="truck" className="w-4 h-4 text-google-blue-600 dark:text-blue-400" />
              <span>Daftar KPM Tersedia</span>
              <span class="text-xs text-google-surface-500 dark:text-slate-400 font-semibold">({{ deliveries.length }})</span>
            </h3>
            <p v-if="readyToDepartDeliveries.length > 1" class="text-[11px] text-google-surface-500 dark:text-slate-400 mt-0.5">
              Centang beberapa KPM untuk inisialisasi sekaligus (1 armada truk).
            </p>
          </div>
          <button class="btn-secondary !py-1.5 !px-3 !text-xs !font-bold" :disabled="busy" @click="$emit('refresh-deliveries')">
            <Icon name="refresh" :className="busy ? 'w-3.5 h-3.5 animate-spin' : 'w-3.5 h-3.5'" />
          </button>
        </div>

        <!-- Batch Toolbar for Ready Deliveries -->
        <div v-if="readyToDepartDeliveries.length > 1" class="mt-3 p-2.5 bg-google-blue-50/80 dark:bg-blue-950/40 border border-google-blue-200/80 dark:border-blue-900/50 rounded-2xl flex items-center justify-between gap-2 text-xs">
          <div class="flex items-center gap-2">
            <span class="font-bold text-google-blue-900 dark:text-blue-200">Mode Batch:</span>
            <span
              class="px-2 py-0.5 rounded-full font-mono font-extrabold text-[11px]"
              :class="selectedKpmNumbers.length > 0 ? 'bg-google-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'"
            >
              {{ selectedKpmNumbers.length }} dipilih
            </span>
          </div>
          <div class="flex items-center gap-1.5">
            <button
              type="button"
              class="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 hover:bg-google-blue-100 dark:hover:bg-blue-900/50 text-google-blue-700 dark:text-blue-300 border border-google-blue-300 dark:border-blue-700 shadow-xs transition"
              @click="selectAllReadyToDepart"
            >
              ✓ Pilih Semua ({{ readyToDepartDeliveries.length }})
            </button>
            <button
              v-if="selectedKpmNumbers.length > 0"
              type="button"
              class="text-[11px] font-bold px-2 py-1 rounded-xl bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-slate-200 dark:border-slate-700 shadow-xs transition"
              @click="clearSelection"
            >
              ✕ Batal
            </button>
          </div>
        </div>

        <div v-if="!deliveries.length" class="py-14 text-center text-xs text-google-surface-500 dark:text-slate-400">
          <div class="w-12 h-12 mx-auto mb-2 rounded-2xl bg-google-surface-100 dark:bg-slate-800 flex items-center justify-center text-google-surface-400 dark:text-slate-500">
            <Icon name="check" className="w-6 h-6 text-google-green-600 dark:text-emerald-400" />
          </div>
          <p class="font-bold text-google-surface-700 dark:text-slate-200">Tidak ada KPM yang perlu diperbarui</p>
          <p class="text-[11px] text-google-surface-400 dark:text-slate-500 mt-0.5">Semua penugasan saat ini telah selesai diproses.</p>
        </div>

        <div class="mt-3 space-y-2.5">
          <div
            v-for="item in deliveries"
            :key="item.nomor"
            class="w-full rounded-2xl border p-4 text-left transition-all hover:border-google-blue-400 hover:bg-google-blue-50/50 dark:hover:border-blue-500 dark:hover:bg-blue-950/30 shadow-sm cursor-pointer"
            :class="(selectedDelivery?.nomor === item.nomor && !isBatchMode) || selectedKpmNumbers.includes(item.nomor) ? 'border-google-blue-600 bg-google-blue-50/70 ring-2 ring-google-blue-600/20 dark:bg-blue-950/50 dark:border-blue-500' : 'border-google-surface-300 bg-white dark:bg-slate-800/70 dark:border-slate-800'"
            @click="handleSelectDelivery(item)"
          >
            <div class="flex items-start gap-3">
              <!-- Checkbox for batch departure -->
              <div v-if="item.nextAction === 'Jalan' || item.nextAction === 'Berangkat'" class="pt-0.5" @click.stop>
                <input
                  type="checkbox"
                  :checked="selectedKpmNumbers.includes(item.nomor)"
                  @change="toggleKpmSelection(item.nomor)"
                  class="w-4 h-4 rounded text-google-blue-600 border-google-surface-400 dark:border-slate-600 dark:bg-slate-700 focus:ring-google-blue-500 cursor-pointer"
                  :title="'Centang KPM ' + item.nomor + ' untuk inisialisasi keberangkatan batch'"
                />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex justify-between items-start gap-2">
                  <div>
                    <span class="text-xs font-mono font-bold text-google-blue-700 dark:text-blue-300 uppercase bg-google-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-google-blue-200 dark:border-blue-800/60">
                      {{ item.nomor }}
                    </span>
                    <p class="text-xs font-bold text-google-surface-800 dark:text-slate-100 mt-1.5 truncate">{{ item.proyek || 'Line Feeding' }}</p>
                    <p class="text-[11px] text-google-surface-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                      <Icon name="location" className="w-3 h-3 text-google-surface-400 dark:text-slate-500 flex-shrink-0" />
                      <span class="truncate">{{ item.lokasi || `${item.lokasiBerangkat || '-'} ➔ ${item.lokasiTiba || '-'}` }}</span>
                    </p>
                  </div>
                  <span class="chip !text-[10px] !font-bold bg-google-blue-100 dark:bg-blue-950/60 text-google-blue-800 dark:text-blue-300 border border-google-blue-200 dark:border-blue-800/60 flex items-center gap-1 flex-shrink-0">
                    <Icon name="chevron-right" className="w-3 h-3" />
                    <span>{{ item.nextAction }}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Update Form Area (Dedicated Batch Form when isBatchMode, else Single Item Form) -->
      <form v-if="isBatchMode" class="panel space-y-5" @submit.prevent="handleStageDepartureGateBatch">
        <div class="border-b border-google-surface-200/90 dark:border-slate-800 pb-3 flex items-start justify-between gap-2">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono font-black text-white bg-google-blue-600 px-2.5 py-0.5 rounded-lg shadow-xs">
                BATCH DEPARTURE
              </span>
              <span class="text-xs font-bold text-google-blue-700 dark:text-blue-300 bg-google-blue-50 dark:bg-blue-950/50 border border-google-blue-200 dark:border-blue-800/60 px-2 py-0.5 rounded-lg">
                {{ selectedKpmNumbers.length }} KPM Terpilih
              </span>
            </div>
            <h3 class="text-base font-bold text-google-surface-900 dark:text-slate-100 mt-1.5">Inisialisasi Keberangkatan Bersama (1 Truk)</h3>
            <p class="text-xs text-google-surface-500 dark:text-slate-400 mt-0.5">
              Seluruh KPM di bawah akan diberangkatkan sekaligus. Checker di gerbang asal dapat mengizinkan seluruh muatan dengan 1 klik.
            </p>
          </div>
          <button
            type="button"
            class="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2.5 py-1.5 rounded-xl transition"
            @click="clearSelection"
          >
            Batalkan
          </button>
        </div>

        <!-- Selected KPMs list preview -->
        <div class="space-y-2 max-h-56 overflow-y-auto pr-1">
          <div
            v-for="bItem in selectedBatchDeliveries"
            :key="bItem.nomor"
            class="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 p-3 text-xs flex items-center justify-between gap-3"
          >
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <strong class="font-mono text-google-blue-700 dark:text-blue-400 text-xs">{{ bItem.nomor }}</strong>
                <span class="text-slate-400">&bull;</span>
                <span class="font-bold text-slate-800 dark:text-slate-100 truncate">{{ bItem.proyek || 'Line Feeding' }}</span>
              </div>
              <div class="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                📍 {{ bItem.lokasi || `${bItem.lokasiBerangkat || '-'} ➔ ${bItem.lokasiTiba || '-'}` }}
              </div>
            </div>
            <button
              type="button"
              class="w-6 h-6 rounded-full bg-slate-200/70 dark:bg-slate-700 hover:bg-rose-100 dark:hover:bg-rose-950/60 hover:text-rose-700 dark:hover:text-rose-300 text-slate-500 dark:text-slate-300 flex items-center justify-center font-bold text-xs transition flex-shrink-0"
              @click.stop="toggleKpmSelection(bItem.nomor)"
              title="Keluarkan dari batch"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- Driver Name Field -->
        <label class="block">
          <span class="label">Nama Pengemudi / Driver Truk</span>
          <input :value="driverName" @input="handleDriverNameInput" class="field" placeholder="Contoh: PAK BUDI" />
          <div v-if="isIT" class="mt-1.5 flex items-center gap-1.5">
            <span class="text-[10.5px] text-purple-700 dark:text-purple-400 font-semibold">Testing Quick-Fill:</span>
            <button type="button" class="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 hover:bg-purple-200 border border-purple-300 dark:border-purple-800" @click="$emit('update-driver-name', 'IT')">🧪 IT</button>
            <button type="button" class="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 hover:bg-purple-200 border border-purple-300 dark:border-purple-800" @click="$emit('update-driver-name', 'ST')">🧪 ST</button>
          </div>
        </label>

        <!-- Cargo Photo for entire batch -->
        <label class="block">
          <span class="label flex items-center justify-between">
            <span>Foto Bukti Muatan Truk (Kamera Langsung)</span>
            <span class="text-[11px] font-normal text-slate-400 dark:text-slate-500">(Opsional - Berlaku untuk semua KPM)</span>
          </span>
          <input
            class="field cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-google-blue-50 dark:file:bg-blue-950/60 file:text-google-blue-700 dark:file:text-blue-300 hover:file:bg-google-blue-100"
            type="file"
            accept="image/*"
            capture="environment"
            @change="onPhoto"
          />
        </label>

        <div class="pt-2">
          <button
            class="btn-success w-full min-h-[48px] !py-3.5 !text-sm !font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition active:scale-[0.98]"
            :disabled="busy || departureStagingBusy"
          >
            <Icon v-if="departureStagingBusy || busy" name="refresh" className="w-4 h-4 animate-spin" />
            <template v-else>
              <Icon name="truck" className="w-4 h-4" />
              <span>Minta Izin Checker untuk {{ selectedKpmNumbers.length }} KPM Sekaligus (Gate Out)</span>
            </template>
          </button>
        </div>
      </form>

      <!-- Single Item Update Form -->
      <form v-else class="panel space-y-5" @submit.prevent="handleSubmit">
        <div v-if="!selectedDelivery" class="py-16 text-center text-xs text-google-surface-400 dark:text-slate-500">
          <div class="w-12 h-12 mx-auto mb-2.5 rounded-2xl bg-google-surface-100 dark:bg-slate-800 flex items-center justify-center text-google-surface-400 dark:text-slate-500">
            <Icon name="doc" className="w-6 h-6" />
          </div>
          <p class="font-bold text-google-surface-700 dark:text-slate-200 text-sm">Pilih KPM dari daftar</p>
          <p class="text-xs text-google-surface-500 dark:text-slate-400 mt-0.5">Klik salah satu KPM di sebelah kiri untuk melihat rincian dan mengunggah foto.</p>
        </div>

        <template v-else>
          <div class="border-b border-google-surface-200/90 dark:border-slate-800 pb-3">
            <span class="text-xs font-mono font-bold text-google-blue-700 dark:text-blue-300 uppercase bg-google-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-google-blue-200 dark:border-blue-800/60">
              {{ selectedDelivery.nomor }}
            </span>
            <h3 class="text-base font-bold text-google-surface-900 dark:text-slate-100 mt-1.5">{{ selectedDelivery.proyek }}</h3>
            <p class="text-xs text-google-surface-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
              <Icon name="location" className="w-3.5 h-3.5 text-google-surface-400 dark:text-slate-500" />
              <span>{{ selectedDelivery.lokasi || `${selectedDelivery.lokasiBerangkat || '-'} ➔ ${selectedDelivery.lokasiTiba || '-'}` }}</span>
            </p>
          </div>

          <!-- 1-Click GMaps Navigation Button -->
          <div>
            <button
              type="button"
              class="w-full min-h-[44px] py-2.5 px-3 rounded-xl bg-google-blue-50 dark:bg-blue-950/40 hover:bg-google-blue-100 dark:hover:bg-blue-900/50 text-google-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center gap-2 border border-google-blue-200 dark:border-blue-800/60 transition shadow-sm focus-visible:outline-none"
              @click="openWorkshopNavigation(selectedDelivery.lokasiTiba || selectedDelivery.wsTujuan)"
            >
              <Icon name="map" className="w-4 h-4" />
              <span>Buka Navigasi Rute di Google Maps (Ke {{ selectedDelivery.lokasiTiba || selectedDelivery.wsTujuan || 'Tujuan' }})</span>
              <Icon name="external" className="w-3.5 h-3.5 text-google-blue-500 dark:text-blue-400" />
            </button>
          </div>

          <div class="rounded-2xl bg-google-yellow-50/80 dark:bg-amber-950/30 border border-google-yellow-200/90 dark:border-amber-900/50 p-4 text-xs">
            <p class="font-bold text-google-yellow-950 dark:text-amber-300 mb-2 flex items-center gap-1.5">
              <Icon name="box" className="w-3.5 h-3.5 text-google-yellow-800 dark:text-amber-400" />
              <span>Material Bawaan:</span>
            </p>
            <div v-for="material in selectedDelivery.daftarBarang" :key="`${material.nama}-${material.qty}`" class="flex justify-between py-1 border-b border-google-yellow-200/50 dark:border-amber-900/40 last:border-0 text-google-yellow-950 dark:text-amber-200">
              <span class="font-medium">{{ material.nama }}</span>
              <strong class="font-mono font-bold">{{ material.qty }} {{ material.uom }}</strong>
            </div>
          </div>

          <label class="block">
            <span class="label">Nama Pengemudi / Driver</span>
            <input :value="driverName" @input="handleDriverNameInput" class="field" placeholder="Contoh: PAK BUDI" />
            <div v-if="isIT" class="mt-1.5 flex items-center gap-1.5">
              <span class="text-[10.5px] text-purple-700 dark:text-purple-400 font-semibold">Testing Quick-Fill:</span>
              <button type="button" class="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 hover:bg-purple-200 border border-purple-300 dark:border-purple-800" @click="$emit('update-driver-name', 'IT')">🧪 IT</button>
              <button type="button" class="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 hover:bg-purple-200 border border-purple-300 dark:border-purple-800" @click="$emit('update-driver-name', 'ST')">🧪 ST</button>
            </div>
          </label>

          <label class="block">
            <span class="label">Status Perjalanan Berikutnya</span>
            <select v-model="updateForm.statusKPM" class="field font-bold text-google-blue-700 dark:text-blue-400">
              <option :value="selectedDelivery.nextAction">{{ selectedDelivery.nextAction }}</option>
            </select>
          </label>

          <label class="block">
            <span class="label flex items-center justify-between">
              <span>Foto Bukti (Kamera Langsung)</span>
              <span class="text-[11px] font-normal text-slate-400 dark:text-slate-500">(Opsional)</span>
            </span>
            <input
              class="field cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-google-blue-50 dark:file:bg-blue-950/60 file:text-google-blue-700 dark:file:text-blue-300 hover:file:bg-google-blue-100"
              type="file"
              accept="image/*"
              capture="environment"
              @change="onPhoto"
            />
          </label>

          <div class="pt-2">
            <button
              class="btn-success w-full min-h-[48px] !py-3.5 !text-sm !font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition active:scale-[0.98]"
              :disabled="busy || stagingBusy || departureStagingBusy"
            >
              <Icon v-if="stagingBusy || departureStagingBusy || busy" name="refresh" className="w-4 h-4 animate-spin" />
              <template v-else-if="updateForm.statusKPM === 'Tiba'">
                <Icon name="qr" className="w-4 h-4" />
                <span>Tampilkan QR Penerima</span>
              </template>
              <template v-else-if="updateForm.statusKPM === 'Jalan' || updateForm.statusKPM === 'Berangkat'">
                <Icon name="truck" className="w-4 h-4" />
                <span>Minta Izin Checker (Gate Out)</span>
              </template>
              <template v-else>
                <Icon name="check" className="w-4 h-4" />
                <span>Simpan Pembaruan Status</span>
              </template>
            </button>
          </div>
        </template>
      </form>
    </div>

    <!-- Recipient QR Code Handover Modal -->
    <Transition name="modal-fade">
      <div
        v-if="showQrModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
        @click.self="closeQrModal"
      >
        <div class="animate-scaleIn bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 text-center relative overflow-hidden transition-colors">
          <!-- Google Quad-Color Top Accent Bar -->
          <div class="google-bar absolute top-0 left-0 right-0"></div>

          <!-- Success Animation if Recipient Confirmed -->
          <div v-if="isConfirmed" class="py-6 animate-springPop">
            <div class="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/40 border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 shadow-inner">
              <Icon name="check" className="w-8 h-8" />
            </div>
            <h3 class="text-lg font-black text-slate-900 dark:text-white">Barang Resmi Diterima!</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Dikonfirmasi oleh <strong class="text-slate-900 dark:text-white">{{ confirmedRecipientName }}</strong>.</p>
            <p class="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-3">Menutup jendela dan memperbarui daftar...</p>
          </div>

          <!-- Normal Scanning State -->
          <div v-else>
            <div class="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
              <div class="text-left">
                <span class="text-[10.5px] font-bold uppercase tracking-wider text-google-blue-600 dark:text-blue-400 block">Serah Terima Material</span>
                <h3 class="text-sm font-black text-slate-900 dark:text-white font-mono">{{ selectedDelivery?.nomor }}</h3>
              </div>
              <button
                type="button"
                class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs font-bold transition-all duration-200 active:scale-90 focus-visible:outline-none"
                @click="closeQrModal"
                title="Tutup dialog QR"
              >
                <Icon name="close" className="w-4 h-4" />
              </button>
            </div>

            <p class="text-xs text-slate-600 dark:text-slate-300 mb-4">
              Minta <strong>Penerima Barang</strong> men-scan QR Code di bawah dengan kamera ponsel mereka untuk mengonfirmasi penerimaan:
            </p>

            <!-- QR Code Image (Keep white padding inside dark wrapper for camera contrast) -->
            <div class="bg-white p-4 rounded-2xl border border-slate-200 dark:border-slate-700 inline-block shadow-inner mb-3">
              <img
                :src="qrImageUrl"
                alt="QR Code Konfirmasi Penerima"
                class="w-56 h-56 mx-auto rounded-xl shadow-xs transition-transform hover:scale-102"
              />
            </div>

            <!-- Live Waiting Indicator -->
            <div class="flex items-center justify-center gap-2 text-xs font-semibold text-google-blue-700 dark:text-blue-300 bg-google-blue-50 dark:bg-blue-950/50 py-2.5 px-3 rounded-xl mb-4 border border-google-blue-100 dark:border-blue-900/50">
              <span class="relative flex h-2.5 w-2.5">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-google-blue-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-google-blue-600"></span>
              </span>
              <span>Menunggu scan &amp; konfirmasi penerima...</span>
            </div>

            <!-- Actions: Copy Link & Close -->
            <div class="space-y-2">
              <button
                type="button"
                class="w-full min-h-[44px] py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 focus-visible:outline-none"
                @click="copyConfirmationLink"
              >
                <Icon v-if="copySuccess" name="check" className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <Icon v-else name="doc" className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>{{ copySuccess ? 'Link Berhasil Disalin!' : 'Salin Tautan Konfirmasi' }}</span>
              </button>

              <a
                :href="qrTargetUrl"
                target="_blank"
                class="inline-flex items-center justify-center gap-1 w-full py-2 text-center text-[11px] font-bold text-google-blue-600 dark:text-blue-400 hover:underline"
              >
                <span>Buka Halaman Konfirmasi di Tab Baru</span>
                <Icon name="external" className="w-3 h-3" />
              </a>

              <button
                type="button"
                class="w-full py-2 text-center text-xs font-bold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                @click="closeQrModal"
              >
                Tutup Jendela
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Departure Waiting Modal (Driver waiting for Origin Gate Checker to authorize) -->
    <Transition name="modal-fade">
      <div
        v-if="showDepartureModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
        @click.self="closeDepartureModal"
      >
        <div class="animate-scaleIn bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 text-center relative overflow-hidden transition-colors">
          <!-- Google Quad-Color Top Accent Bar -->
          <div class="google-bar absolute top-0 left-0 right-0"></div>

          <!-- Success Animation if Checker Confirmed -->
          <div v-if="departureConfirmed" class="py-6 animate-springPop">
            <div class="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/40 border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 shadow-inner">
              <Icon name="check" className="w-8 h-8" />
            </div>
            <h3 class="text-lg font-black text-slate-900 dark:text-white">Izin Jalan Diberikan!</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Diverifikasi oleh <strong class="text-slate-900 dark:text-white">{{ departureCheckerName }}</strong> di Pos Gerbang.
            </p>
            <p v-if="stagedBatchKpmList.length > 1" class="text-[11px] text-google-blue-700 dark:text-blue-400 font-bold mt-1">
              ✓ Berhasil untuk {{ stagedBatchKpmList.length }} KPM sekaligus
            </p>
            <p class="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-3">Status KPM resmi 'Jalan'. Memperbarui daftar...</p>
          </div>

          <!-- Live Waiting for Checker State -->
          <div v-else>
            <div class="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
              <div class="text-left">
                <span class="text-[10.5px] font-bold uppercase tracking-wider text-google-blue-600 dark:text-blue-400 block">
                  {{ stagedBatchKpmList.length > 1 ? `Pemeriksaan Gerbang (Batch ${stagedBatchKpmList.length} KPM)` : 'Pemeriksaan Gerbang Keluar' }}
                </span>
                <div v-if="stagedBatchKpmList.length > 1" class="flex flex-wrap gap-1 mt-1">
                  <span v-for="kpm in stagedBatchKpmList" :key="kpm" class="font-mono text-xs font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                    {{ kpm }}
                  </span>
                </div>
                <h3 v-else class="text-sm font-black text-slate-900 dark:text-white font-mono">{{ selectedDelivery?.nomor }}</h3>
              </div>
              <button
                type="button"
                class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs font-bold transition-all duration-200 active:scale-90 focus-visible:outline-none"
                @click="closeDepartureModal"
                title="Tutup jendela"
              >
                <Icon name="close" className="w-4 h-4" />
              </button>
            </div>

            <div class="w-16 h-16 mx-auto my-3 rounded-2xl bg-google-blue-50 dark:bg-blue-950/50 border border-google-blue-200 dark:border-blue-800/60 text-google-blue-600 dark:text-blue-400 flex items-center justify-center shadow-2xs">
              <Icon name="shield" className="w-8 h-8 text-google-blue-600 dark:text-blue-400" />
            </div>

            <p class="text-xs font-bold text-slate-800 dark:text-slate-100 mb-1">
              Menunggu Verifikasi Petugas Checker
            </p>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              <template v-if="stagedBatchKpmList.length > 1">
                Tunjukkan nomor KPM atau lembar fisik salah satu KPM kepada petugas Checker di pos gerbang asal. Petugas akan men-scan <strong>QR Checker</strong> dan dapat mengizinkan seluruh <strong>{{ stagedBatchKpmList.length }} KPM</strong> dalam satu klik.
              </template>
              <template v-else>
                Tunjukkan lembar fisik KPM kepada petugas Checker di pos gerbang asal. Petugas akan men-scan <strong>QR Checker (Tengah)</strong> untuk memeriksa muatan dan mengizinkan jalan.
              </template>
            </p>

            <!-- Live Waiting Pulsing Indicator -->
            <div class="flex items-center justify-center gap-2 text-xs font-semibold text-google-blue-700 dark:text-blue-300 bg-google-blue-50 dark:bg-blue-950/50 py-2.5 px-3 rounded-xl mb-4 border border-google-blue-100 dark:border-blue-800/60">
              <span class="relative flex h-2.5 w-2.5">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-google-blue-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-google-blue-600"></span>
              </span>
              <span>Menunggu scan &amp; izin dari Checker...</span>
            </div>

            <button
              type="button"
              class="w-full py-2 text-center text-xs font-bold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              @click="closeDepartureModal"
            >
              Tutup (Tetap Berjalan di Latar)
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </section>
</template>
