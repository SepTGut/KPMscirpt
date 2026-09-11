<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import Icon from './Icon.vue'
import { requestApi } from '../composables/useApi'

const api = (action, opts) => requestApi(action, opts)

const props = defineProps({
  kpmNomor: { type: String, default: '' },
  isIT: { type: Boolean, default: false }
})

const emit = defineEmits(['verified', 'rejected', 'back-to-home'])

const kpmId = ref(props.kpmNomor || '')
const activeKpms = ref([])

watch(() => props.kpmNomor, (newVal) => {
  if (newVal) {
    kpmId.value = newVal
    fetchKpmDetails()
  }
})

const kpmDetail = ref(null)
const loadingDetail = ref(false)
const checkerName = ref('')
const catatan = ref('')
const submitting = ref(false)
const errorMessage = ref('')
const isVerified = ref(false)
const verifiedAt = ref('')

// Strict sequential staging state
const isStagedByDriver = ref(false)
const stagedDriverName = ref('')
const stagedPhotoUrl = ref('')

// Batch Departure State
const batchItems = ref([])
const batchId = ref('')
const rejectEntireBatch = ref(false)

// Rejection state
const isRejected = ref(false)
const rejectionReason = ref('')
const showRejectModal = ref(false)
const rejectReasonInput = ref('')
const rejecting = ref(false)

const finalCheckerName = computed(() => {
  return (checkerName.value || '').trim() || 'Checker Pos Gerbang'
})

const canSubmit = computed(() => {
  return kpmId.value.trim().length > 0 && !submitting.value && !rejecting.value && (isStagedByDriver.value || props.isIT)
})

async function loadAvailableKpms() {
  try {
    const list = await api('getMonitoring', { method: 'GET' })
    if (Array.isArray(list)) {
      activeKpms.value = list.filter(k => k.status === 'Baru Dibuat' || k.status === 'Belum Berangkat' || k.status === 'Jalan')
    }
  } catch {}
}

async function fetchKpmDetails() {
  if (!kpmId.value) return
  loadingDetail.value = true
  errorMessage.value = ''
  try {
    // 1. Check departure status (staged, confirmed, or rejected)
    const depStatus = await api('checkDepartureStatus', {
      method: 'GET',
      body: { nomorKPM: kpmId.value, refresh: 'true' }
    }).catch(() => null)

    if (depStatus) {
      if (depStatus.isConfirmed) {
        isVerified.value = true
        verifiedAt.value = depStatus.confirmedAt || ''
      }
      isStagedByDriver.value = Boolean(depStatus.isStaged)
      if (depStatus.stagedData) {
        stagedDriverName.value = depStatus.stagedData.driver || ''
        stagedPhotoUrl.value = depStatus.stagedData.urlFoto || ''
        if (Array.isArray(depStatus.stagedData.batchItems) && depStatus.stagedData.batchItems.length > 1) {
          batchItems.value = depStatus.stagedData.batchItems
          batchId.value = depStatus.stagedData.batchId || ''
        } else {
          batchItems.value = []
          batchId.value = ''
        }
      } else {
        batchItems.value = []
        batchId.value = ''
      }
      isRejected.value = Boolean(depStatus.isRejected)
      if (depStatus.isRejected) {
        rejectionReason.value = depStatus.alasan || ''
      }
    } else {
      batchItems.value = []
      batchId.value = ''
    }

    // 2. Fetch KPM monitoring details (items, route, pic)
    const list = await api('getMonitoring', { method: 'GET', body: { refresh: 'true' } })
    if (Array.isArray(list)) {
      const match = list.find(k => (k.nomor === kpmId.value || k.kpmId === kpmId.value))
      if (match) {
        kpmDetail.value = match
        if (match.status === 'Jalan' || match.status === 'Tiba' || match.status === 'Selesai') {
          isVerified.value = true
          verifiedAt.value = match.waktuBerangkat || ''
        }
      }
    }
  } catch (err) {
    console.warn('[Fetch KPM Detail notice]', err)
  } finally {
    loadingDetail.value = false
  }
}

async function handleVerifyGateOut(verifyBatch = false) {
  if (!canSubmit.value) return
  errorMessage.value = ''
  submitting.value = true

  try {
    const isBatchAction = verifyBatch && batchItems.value.length > 1
    const bodyPayload = {
      namaChecker: finalCheckerName.value,
      catatan: catatan.value.trim(),
      isIT: props.isIT ? 'true' : ''
    }

    if (isBatchAction) {
      bodyPayload.nomorKPMs = batchItems.value
      bodyPayload.confirmBatch = 'true'
    } else {
      bodyPayload.nomorKPM = kpmId.value.trim()
    }

    const res = await api('confirmDepartureSecurity', {
      body: bodyPayload
    })

    isVerified.value = true
    verifiedAt.value = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
    emit('verified', {
      nomorKPM: kpmId.value.trim(),
      batchItems: isBatchAction ? batchItems.value : null,
      checker: finalCheckerName.value,
      res
    })
  } catch (err) {
    errorMessage.value = err.message || 'Gagal memverifikasi keberangkatan. Silakan coba lagi.'
  } finally {
    submitting.value = false
  }
}

function openRejectModal() {
  rejectReasonInput.value = ''
  errorMessage.value = ''
  rejectEntireBatch.value = (batchItems.value.length > 1)
  showRejectModal.value = true
}

function closeRejectModal() {
  showRejectModal.value = false
}

async function handleConfirmReject() {
  if (!rejectReasonInput.value.trim()) {
    alert('Mohon isi alasan penolakan keberangkatan.')
    return
  }
  rejecting.value = true
  errorMessage.value = ''
  try {
    const isBatchReject = rejectEntireBatch.value && batchItems.value.length > 1
    const bodyPayload = {
      nomorKPM: kpmId.value.trim(),
      namaChecker: finalCheckerName.value,
      alasanPenolakan: rejectReasonInput.value.trim()
    }
    if (isBatchReject) {
      bodyPayload.rejectBatch = 'true'
      bodyPayload.nomorKPMs = batchItems.value
    }

    await api('rejectDepartureSecurity', {
      body: bodyPayload
    })
    isRejected.value = true
    rejectionReason.value = rejectReasonInput.value.trim()
    isStagedByDriver.value = false
    showRejectModal.value = false
    emit('rejected', {
      nomorKPM: kpmId.value.trim(),
      batchItems: isBatchReject ? batchItems.value : null,
      checker: finalCheckerName.value,
      alasan: rejectReasonInput.value.trim()
    })
  } catch (err) {
    errorMessage.value = err.message || 'Gagal menolak keberangkatan.'
  } finally {
    rejecting.value = false
  }
}

onMounted(() => {
  loadAvailableKpms()
  if (kpmId.value) {
    fetchKpmDetails()
  }
})
</script>

<template>
  <div class="w-full max-w-xl mx-auto p-4 sm:p-6 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-3xl shadow-xl border border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-100 animate-slideUpFade transition-colors">
    <!-- Header Card -->
    <div class="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
      <div class="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm flex-shrink-0 transition-transform duration-300 hover:scale-105">
        <Icon name="shield" className="w-6 h-6" />
      </div>
      <div class="flex-1 min-w-0">
        <h2 class="text-lg font-black text-slate-900 dark:text-white leading-tight truncate">Verifikasi Checker Gerbang Asal</h2>
        <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Pemeriksaan fisik muatan sebelum armada keluar (Gate Out)</p>
      </div>
      <button
        @click="emit('back-to-home')"
        class="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-sm font-bold transition-all duration-200 active:scale-90 flex-shrink-0"
        title="Kembali ke Beranda"
      >
        ✕
      </button>
    </div>

    <!-- Success State -->
    <div v-if="isVerified" class="text-center py-6 space-y-4 animate-springPop">
      <div class="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
        <Icon name="check" className="w-8 h-8" />
      </div>
      <div>
        <h3 class="text-lg font-black text-slate-900 dark:text-white">Keberangkatan Resmi Diizinkan!</h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">KPM <span class="font-mono font-bold text-slate-800 dark:text-slate-200">{{ kpmId }}</span> kini berstatus <span class="font-bold text-emerald-700 dark:text-emerald-400">Jalan</span>.</p>
      </div>
      <div class="bg-emerald-50/90 dark:bg-emerald-950/40 rounded-2xl p-4 border border-emerald-200 dark:border-emerald-800 text-left text-xs text-emerald-900 dark:text-emerald-200 space-y-1.5 max-w-md mx-auto shadow-2xs">
        <div class="flex justify-between">
          <span class="text-emerald-700 dark:text-emerald-300">Petugas Checker:</span>
          <span class="font-bold">{{ finalCheckerName }}</span>
        </div>
        <div v-if="verifiedAt" class="flex justify-between">
          <span class="text-emerald-700 dark:text-emerald-300">Waktu Izin Gerbang:</span>
          <span class="font-mono font-bold">{{ verifiedAt }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-emerald-700 dark:text-emerald-300">Armada Lapangan:</span>
          <span class="font-bold">Diizinkan Melaju ke Tujuan</span>
        </div>
      </div>
      <div class="pt-3">
        <button
          @click="emit('back-to-home')"
          class="btn-primary !px-6 !py-2.5 !text-xs font-bold shadow-md hover:shadow-lg transition-all"
        >
          Selesai &amp; Tutup Halaman
        </button>
      </div>
    </div>

    <!-- Active Verification Form -->
    <div v-else class="space-y-4">
      <!-- Error Message Box -->
      <div v-if="errorMessage" class="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-2">
        <Icon name="alert" className="w-4 h-4 flex-shrink-0" />
        <span>{{ errorMessage }}</span>
      </div>

      <!-- Rejection Banner (if previously rejected) -->
      <div v-if="isRejected" class="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl text-xs text-rose-900 dark:text-rose-200 space-y-1">
        <div class="flex items-center gap-2 font-bold text-rose-800 dark:text-rose-300">
          <Icon name="alert" className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>Keberangkatan KPM Pernah Ditolak</span>
        </div>
        <p class="text-[11.5px] text-rose-700 dark:text-rose-300/90">
          Alasan: <strong>{{ rejectionReason }}</strong>. Driver harus melakukan inisialisasi ulang setelah muatan diperbaiki.
        </p>
      </div>

      <!-- Driver Staging Status Banner -->
      <div v-if="!isStagedByDriver && !loadingDetail" class="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl text-xs text-amber-900 dark:text-amber-200 space-y-1">
        <div class="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
          <Icon name="alert" className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>Menunggu Inisialisasi Driver</span>
        </div>
        <p class="text-[11px] text-amber-700 dark:text-amber-300/90 leading-relaxed">
          Driver belum menekan tombol <strong>"Minta Izin Checker"</strong> di aplikasinya. Mohon minta driver menginisialisasi keberangkatan terlebih dahulu sebelum memeriksa.
        </p>
      </div>

      <div v-else-if="isStagedByDriver" class="space-y-2">
        <div class="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl text-xs">
          <div class="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
            <Icon name="check" className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Driver Siap Diperiksa ({{ stagedDriverName || kpmDetail?.driver || 'Driver' }})</span>
          </div>
          <span class="font-mono text-emerald-700 dark:text-emerald-400 text-[10.5px] font-bold">Inisialisasi OK</span>
        </div>

        <!-- Batch Truk Detected Banner -->
        <div v-if="batchItems.length > 1" class="p-3.5 bg-google-blue-50 dark:bg-blue-950/40 border border-google-blue-200 dark:border-blue-900/60 rounded-2xl text-xs space-y-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 font-bold text-google-blue-900 dark:text-blue-300">
              <Icon name="truck" className="w-4 h-4 text-google-blue-600 dark:text-blue-400 flex-shrink-0" />
              <span>Muatan Truk Batch Terdeteksi ({{ batchItems.length }} KPM)</span>
            </div>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-google-blue-600 text-white">
              1 Truk
            </span>
          </div>
          <p class="text-[11px] text-google-blue-800 dark:text-blue-200/90 leading-relaxed">
            Driver <strong>{{ stagedDriverName || kpmDetail?.driver }}</strong> membawa <strong>{{ batchItems.length }} KPM</strong> sekaligus dalam satu armada:
          </p>
          <div class="flex flex-wrap gap-1.5 pt-0.5">
            <button
              type="button"
              v-for="bKpm in batchItems"
              :key="bKpm"
              class="px-2.5 py-1 rounded-lg font-mono text-xs font-bold border transition"
              :class="bKpm === kpmId ? 'bg-google-blue-600 text-white border-google-blue-700 shadow-xs' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-google-blue-400'"
              @click="if (bKpm !== kpmId) { kpmId = bKpm; fetchKpmDetails(); }"
              :title="bKpm === kpmId ? 'KPM yang sedang dilihat' : 'Klik untuk memeriksa KPM ' + bKpm"
            >
              {{ bKpm }} {{ bKpm === kpmId ? '★' : '' }}
            </button>
          </div>
        </div>
      </div>

      <!-- KPM Number Display & Quick Selector -->
      <div>
        <div class="flex items-center justify-between mb-1">
          <label class="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Nomor KPM Fisik</label>
          <span v-if="activeKpms.length > 0" class="text-[11px] text-slate-500 dark:text-slate-400 font-medium">atau pilih dari KPM aktif</span>
        </div>
        <div class="flex gap-2">
          <input
            v-model="kpmId"
            type="text"
            placeholder="Contoh: 001/PPO/LF/IX/2026"
            class="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm font-bold text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:border-google-blue-500 focus:outline-none transition"
            @keyup.enter="fetchKpmDetails"
          />
          <button
            @click="fetchKpmDetails"
            :disabled="loadingDetail || !kpmId"
            class="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition disabled:opacity-50"
          >
            {{ loadingDetail ? 'Memuat...' : 'Cek' }}
          </button>
        </div>

        <!-- Quick Selector Dropdown for IT / Operators -->
        <div v-if="activeKpms.length > 0" class="mt-2">
          <select
            class="w-full text-xs font-semibold py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:border-google-blue-500 transition"
            @change="if ($event.target.value) { kpmId = $event.target.value; fetchKpmDetails(); }"
          >
            <option value="">-- ⚡ Pilih KPM Aktif Langsung --</option>
            <option v-for="k in activeKpms" :key="k.nomor" :value="k.nomor">
              {{ k.nomor }} - [{{ k.status }}] ({{ k.lokasiBerangkat || k.wsAwal }} ➔ {{ k.lokasiTiba || k.wsTujuan }})
            </option>
          </select>
        </div>
      </div>

      <!-- Detail KPM Card -->
      <div v-if="kpmDetail" class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs space-y-2">
        <div class="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
          <span class="text-slate-500 dark:text-slate-400">Rute Pengiriman:</span>
          <span class="font-black text-slate-900 dark:text-white text-sm">{{ kpmDetail.wsAwal || kpmDetail.lokasiBerangkat }} ➔ {{ kpmDetail.wsTujuan || kpmDetail.lokasiTiba }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-500 dark:text-slate-400">Driver Bertugas:</span>
          <span class="font-bold text-slate-800 dark:text-slate-200">{{ stagedDriverName || kpmDetail.driver || 'Belum Ditugaskan' }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-500 dark:text-slate-400">PIC KPM:</span>
          <span class="font-bold text-slate-800 dark:text-slate-200">{{ kpmDetail.pic }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-500 dark:text-slate-400">Proyek:</span>
          <span class="font-semibold text-slate-700 dark:text-slate-300">{{ kpmDetail.proyek || '-' }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-500 dark:text-slate-400">Status Terkini:</span>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200">
            {{ kpmDetail.status || 'Belum Berangkat' }}
          </span>
        </div>

        <!-- Material Items Summary -->
        <div v-if="kpmDetail.items && kpmDetail.items.length > 0" class="pt-2 border-t border-slate-200 dark:border-slate-700">
          <span class="text-slate-500 dark:text-slate-400 block mb-1 font-bold">Daftar Muatan ({{ kpmDetail.items.length }} Item):</span>
          <div class="max-h-36 overflow-y-auto space-y-1 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
            <div
              v-for="(itm, idx) in kpmDetail.items"
              :key="idx"
              class="flex justify-between items-center text-[11px] py-0.5 border-b border-slate-50 dark:border-slate-700/50 last:border-0"
            >
              <span class="text-slate-800 dark:text-slate-200 truncate max-w-[240px]">{{ itm.spesifikasi || itm.nama || itm.kode }}</span>
              <span class="font-mono font-bold text-slate-900 dark:text-white ml-2">{{ itm.qty }} {{ itm.uom }}</span>
            </div>
          </div>
        </div>

        <!-- Attached Photo Preview (if driver uploaded) -->
        <div v-if="stagedPhotoUrl || kpmDetail.buktiBerangkat" class="pt-2 border-t border-slate-200 dark:border-slate-700">
          <span class="text-slate-500 dark:text-slate-400 block mb-1 font-bold">Foto Muatan Driver:</span>
          <a :href="stagedPhotoUrl || kpmDetail.buktiBerangkat" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-google-blue-600 dark:text-blue-400 font-bold hover:underline">
            <span>📷 Lihat Foto Muatan</span>
            <Icon name="external" className="w-3 h-3" />
          </a>
        </div>
      </div>

      <!-- Checker Name Form -->
      <div>
        <label class="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
          Nama Petugas Checker / Satpam Gerbang
        </label>
        <input
          v-model="checkerName"
          type="text"
          placeholder="Nama Petugas Checker (opsional, default: Checker Pos Gerbang)"
          class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:border-google-blue-500 focus:outline-none transition"
        />
      </div>

      <!-- Catatan Pemeriksaan Gerbang -->
      <div>
        <label class="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
          Catatan Pemeriksaan Fisik (Opsional)
        </label>
        <input
          v-model="catatan"
          type="text"
          placeholder="Contoh: Muatan dan segel sesuai, plat nomor terverifikasi"
          class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:border-google-blue-500 focus:outline-none transition"
        />
      </div>

      <!-- Action Buttons when Batch Detected -->
      <div v-if="batchItems.length > 1" class="pt-2 space-y-2">
        <button
          type="button"
          @click="handleVerifyGateOut(true)"
          :disabled="!canSubmit"
          class="w-full py-3.5 px-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition active:scale-98 disabled:opacity-40"
        >
          <Icon v-if="submitting" name="refresh" className="w-4 h-4 animate-spin" />
          <Icon v-else name="shield" className="w-4 h-4" />
          <span>{{ submitting ? 'Memverifikasi Seluruh Batch...' : `✓ Izinkan Seluruh Batch (${batchItems.length} KPM Sekaligus)` }}</span>
        </button>

        <div class="flex gap-2">
          <button
            type="button"
            @click="openRejectModal"
            :disabled="!kpmId || submitting || rejecting || !isStagedByDriver"
            class="flex-1 py-2.5 px-3 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-extrabold text-xs rounded-xl border border-rose-200 dark:border-rose-800 flex items-center justify-center gap-1.5 transition active:scale-98 disabled:opacity-40"
          >
            <Icon name="close" className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>Tolak Keberangkatan</span>
          </button>

          <button
            type="button"
            @click="handleVerifyGateOut(false)"
            :disabled="!canSubmit"
            class="flex-1 py-2.5 px-3 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-extrabold text-xs rounded-xl border border-amber-300 dark:border-amber-800 flex items-center justify-center gap-1.5 transition active:scale-98 disabled:opacity-40"
            title="Hanya izinkan nomor KPM ini saja"
          >
            <Icon name="check" className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
            <span>Izinkan KPM Ini Saja</span>
          </button>
        </div>
      </div>

      <!-- Action Buttons: Standard Single KPM -->
      <div v-else class="pt-2 flex flex-col sm:flex-row gap-2.5">
        <button
          type="button"
          @click="openRejectModal"
          :disabled="!kpmId || submitting || rejecting || !isStagedByDriver"
          class="sm:flex-1 py-3 px-4 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-extrabold text-xs rounded-2xl border border-rose-200 dark:border-rose-800 flex items-center justify-center gap-1.5 transition active:scale-98 disabled:opacity-40"
        >
          <Icon name="close" className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          <span>Tolak Keberangkatan</span>
        </button>

        <button
          type="button"
          @click="handleVerifyGateOut(false)"
          :disabled="!canSubmit"
          class="sm:flex-2 py-3.5 px-5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition active:scale-98 disabled:opacity-40"
        >
          <Icon v-if="submitting" name="refresh" className="w-4 h-4 animate-spin" />
          <Icon v-else name="shield" className="w-4 h-4" />
          <span>{{ submitting ? 'Memverifikasi Gerbang...' : '✓ Verifikasi &amp; Izinkan Jalan (Gate Out)' }}</span>
        </button>
      </div>
    </div>

    <!-- Rejection Reason Modal -->
    <Transition name="modal-fade">
      <div
        v-if="showRejectModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
        @click.self="closeRejectModal"
      >
        <div class="animate-scaleIn bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 text-left relative overflow-hidden space-y-4 text-slate-800 dark:text-slate-100 transition-colors">
          <div class="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 class="text-sm font-black text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
              <Icon name="alert" className="w-4 h-4 text-rose-600" />
              <span>Tolak Keberangkatan KPM</span>
            </h3>
            <button
              type="button"
              @click="closeRejectModal"
              class="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs font-bold transition-all duration-200 active:scale-90"
            >
              ✕
            </button>
          </div>

          <p class="text-xs text-slate-600 dark:text-slate-300">
            Masukkan alasan ketidaksesuaian muatan/armada. Alasan ini akan tampil langsung di layar driver dan tersimpan dalam riwayat audit:
          </p>

          <textarea
            v-model="rejectReasonInput"
            rows="3"
            placeholder="Contoh: Jumlah barang kurang 5 pcs / driver tidak sesuai surat jalan"
            class="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:border-rose-500 focus:outline-none transition resize-none"
          ></textarea>

          <label v-if="batchItems.length > 1" class="flex items-center gap-2 p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold text-rose-800 dark:text-rose-300 cursor-pointer">
            <input type="checkbox" v-model="rejectEntireBatch" class="w-4 h-4 rounded text-rose-600 border-rose-300 focus:ring-rose-500 cursor-pointer" />
            <span>Tolak seluruh batch ({{ batchItems.length }} KPM dalam armada ini)</span>
          </label>

          <div class="flex gap-2 pt-2">
            <button
              type="button"
              @click="closeRejectModal"
              class="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all active:scale-95"
            >
              Batal
            </button>
            <button
              type="button"
              @click="handleConfirmReject"
              :disabled="rejecting || !rejectReasonInput.trim()"
              class="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all active:scale-95 shadow disabled:opacity-40"
            >
              {{ rejecting ? 'Memproses...' : 'Konfirmasi Tolak' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
