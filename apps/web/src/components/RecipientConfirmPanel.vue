<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import Icon from './Icon.vue'
import { requestApi } from '../composables/useApi'
import { compressImage } from '../composables/useGps'

const api = (action, opts) => requestApi(action, opts)

const props = defineProps({
  kpmNomor: { type: String, default: '' },
  initialRecipient: { type: String, default: '' },
  isIT: { type: Boolean, default: false }
})

const emit = defineEmits(['confirmed', 'back-to-home'])

const kpmId = ref(props.kpmNomor || '')
const activeKpms = ref([])

watch(() => props.kpmNomor, (newVal) => {
  if (newVal) kpmId.value = newVal
})
const selectedRecipient = ref(props.initialRecipient || '')
const customRecipient = ref('')
const isCustom = ref(false)
const recipientsList = ref([])
const loadingList = ref(true)
const submitting = ref(false)
const errorMessage = ref('')
const isConfirmed = ref(false)
const confirmedRecipient = ref('')
const confirmedAt = ref('')
const fotoData = ref('')
const photoPreview = ref('')
const processingPhoto = ref(false)
const photoInputRef = ref(null)

const finalRecipientName = computed(() => {
  if (isCustom.value) return customRecipient.value.trim().toUpperCase()
  return (selectedRecipient.value || '').trim().toUpperCase()
})

const canSubmit = computed(() => {
  return kpmId.value.trim().length > 0 && finalRecipientName.value.length > 0 && !submitting.value
})

async function fetchRecipients() {
  loadingList.value = true
  try {
    const res = await api('getRecipients', { method: 'GET' })
    if (Array.isArray(res) && res.length > 0) {
      recipientsList.value = res
    } else {
      recipientsList.value = ['AANG', 'EKO', 'RULI', 'EGI', 'NUGRAHA', 'TAUFIQ']
    }
  } catch (err) {
    recipientsList.value = ['AANG', 'EKO', 'RULI', 'EGI', 'NUGRAHA', 'TAUFIQ']
  } finally {
    loadingList.value = false
  }
}

async function onPhotoChange(event) {
  const file = event.target.files?.[0]
  if (!file) return
  processingPhoto.value = true
  errorMessage.value = ''
  try {
    const compressed = await compressImage(file)
    fotoData.value = compressed
    photoPreview.value = compressed
  } catch (err) {
    errorMessage.value = 'Gagal memproses foto: ' + (err.message || String(err))
  } finally {
    processingPhoto.value = false
  }
}

function clearPhoto() {
  fotoData.value = ''
  photoPreview.value = ''
  if (photoInputRef.value) {
    photoInputRef.value.value = ''
  }
}

async function handleConfirm() {
  if (!canSubmit.value) return
  errorMessage.value = ''
  submitting.value = true

  try {
    const res = await api('confirmArrivalReceipt', {
      body: {
        nomorKPM: kpmId.value.trim(),
        namaPenerima: finalRecipientName.value,
        fotoDiterima: fotoData.value || ''
      }
    })

    isConfirmed.value = true
    confirmedRecipient.value = finalRecipientName.value
    confirmedAt.value = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    emit('confirmed', {
      nomorKPM: kpmId.value.trim(),
      penerima: finalRecipientName.value
    })
  } catch (e) {
    errorMessage.value = e.message || 'Gagal mengonfirmasi penerimaan barang. Silakan coba lagi.'
  } finally {
    submitting.value = false
  }
}

async function loadAvailableKpms() {
  try {
    const list = await api('getMonitoring', { method: 'GET' })
    if (Array.isArray(list)) {
      activeKpms.value = list.filter(k => k.status === 'Baru Dibuat' || k.status === 'Belum Berangkat' || k.status === 'Jalan' || k.status === 'Tiba')
    }
  } catch {}
}

onMounted(() => {
  // Read kpm from URL if not passed as prop
  if (!kpmId.value && typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search)
    kpmId.value = urlParams.get('kpm') || urlParams.get('nomor') || ''
  }
  fetchRecipients()
  loadAvailableKpms()
})
</script>

<template>
  <div class="max-w-md mx-auto py-6 px-4">
    <!-- Card Container -->
    <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xl overflow-hidden animate-fadeIn text-slate-800 dark:text-slate-100 transition-colors">
      <!-- Top Google Accent Bar -->
      <div class="google-bar"></div>

      <div class="p-6 sm:p-8">
        <!-- Success State -->
        <div v-if="isConfirmed" class="text-center py-6 animate-fadeIn">
          <div class="w-20 h-20 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950/50 border-2 border-emerald-400 flex items-center justify-center shadow-inner mb-4">
            <Icon name="check" className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
          </div>
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 mb-2">
            Status: Telah Tiba & Diterima
          </span>
          <h2 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Barang Berhasil Diterima!</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Konfirmasi serah terima telah tersimpan di sistem monitoring dan arsip T.Log.</p>

          <div class="mt-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-left space-y-2.5 text-xs">
            <div class="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-700/60">
              <span class="text-slate-500 dark:text-slate-400">Nomor KPM:</span>
              <strong class="font-mono font-bold text-google-blue-700 dark:text-blue-400 uppercase">{{ kpmId }}</strong>
            </div>
            <div class="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-700/60">
              <span class="text-slate-500 dark:text-slate-400">Penerima Barang:</span>
              <strong class="font-bold text-slate-900 dark:text-white">{{ confirmedRecipient }}</strong>
            </div>
            <div class="flex justify-between items-center py-1">
              <span class="text-slate-500 dark:text-slate-400">Waktu Konfirmasi:</span>
              <span class="font-mono text-slate-700 dark:text-slate-300">{{ confirmedAt }} WIB</span>
            </div>
          </div>

          <!-- Photo Preview in Confirmation State if Attached -->
          <div v-if="photoPreview" class="mt-4 rounded-2xl overflow-hidden border border-slate-200/90 dark:border-slate-700 shadow-sm max-w-[220px] mx-auto animate-fadeIn">
            <img :src="photoPreview" alt="Foto Serah Terima" class="w-full h-28 object-cover" />
            <div class="py-1 px-2 bg-slate-50 dark:bg-slate-800 text-[10.5px] text-emerald-700 dark:text-emerald-400 font-bold text-center border-t border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1">
              <Icon name="check" className="w-3 h-3" />
              <span>Foto Serah Terima Terlampir</span>
            </div>
          </div>

          <div class="mt-6">
            <button
              type="button"
              class="btn-secondary w-full !py-3 !text-xs !font-bold"
              @click="emit('back-to-home')"
            >
              Kembali ke Beranda
            </button>
          </div>
        </div>

        <!-- Form Confirmation State -->
        <div v-else>
          <div class="text-center mb-6">
            <div class="w-14 h-14 mx-auto rounded-2xl bg-google-blue-50 dark:bg-blue-950/60 border border-google-blue-200 dark:border-blue-800 flex items-center justify-center text-google-blue-600 dark:text-blue-400 shadow-sm mb-3">
              <Icon name="box" className="w-7 h-7" />
            </div>
            <h1 class="text-xl font-black text-slate-900 dark:text-white tracking-tight">Konfirmasi Penerimaan KPM</h1>
            <p class="text-xs text-google-surface-500 dark:text-slate-400 mt-1">Silakan pilih nama Anda sebagai penerima barang lalu tekan tombol konfirmasi.</p>
          </div>

          <!-- KPM Info Badge & Quick Selector -->
          <div class="mb-5 p-4 rounded-2xl bg-google-blue-50/60 dark:bg-blue-950/40 border border-google-blue-100 dark:border-blue-900/60 space-y-2">
            <div class="flex items-center justify-between gap-3">
              <div>
                <span class="text-[10px] font-bold text-google-blue-600 dark:text-blue-400 uppercase tracking-wider block">Surat Penugasan KPM</span>
                <span class="text-sm font-mono font-black text-slate-900 dark:text-white">{{ kpmId || 'Belum Dipilih' }}</span>
              </div>
              <span class="chip !text-[11px] !font-bold bg-white dark:bg-slate-800 text-google-blue-700 dark:text-blue-300 border border-google-blue-200 dark:border-blue-800 shadow-sm">
                Serah Terima
              </span>
            </div>

            <!-- Active KPM Quick Selector Dropdown -->
            <div v-if="activeKpms.length > 0" class="pt-1">
              <select
                class="w-full text-xs font-semibold py-2 px-3 bg-white dark:bg-slate-800 border border-google-blue-200 dark:border-blue-800 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:border-google-blue-500 transition"
                @change="if ($event.target.value) { kpmId = $event.target.value; }"
              >
                <option value="">-- ⚡ Pilih KPM dari Daftar Monitoring --</option>
                <option v-for="k in activeKpms" :key="k.nomor" :value="k.nomor">
                  {{ k.nomor }} - [{{ k.status }}] ({{ k.lokasiBerangkat || k.wsAwal }} ➔ {{ k.lokasiTiba || k.wsTujuan }})
                </option>
              </select>
            </div>
          </div>

          <!-- Error Alert -->
          <div v-if="errorMessage" class="mb-5 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5 animate-fadeIn">
            <Icon name="alert" className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
            <div class="flex-1 font-semibold">{{ errorMessage }}</div>
          </div>

          <form @submit.prevent="handleConfirm" class="space-y-4">
            <!-- Nomor KPM Manual Input Field -->
            <label class="block">
              <span class="label">Nomor KPM Fisik</span>
              <input
                v-model="kpmId"
                type="text"
                class="field uppercase font-mono font-bold"
                placeholder="Contoh: 001/PPO/LF/IX/2026"
                required
              />
            </label>

            <!-- Recipient Selection (2 Options: From Sheet or Custom) -->
            <label class="block">
              <span class="label">Pilih Nama Penerima</span>
              <div v-if="loadingList" class="field bg-slate-50 dark:bg-slate-800 text-slate-400 flex items-center gap-2">
                <Icon name="refresh" className="w-3.5 h-3.5 animate-spin" />
                <span>Memuat daftar penerima dari database...</span>
              </div>
              <select
                v-else
                v-model="selectedRecipient"
                class="field font-bold text-slate-900 dark:text-slate-100"
                @change="isCustom = (selectedRecipient === '__CUSTOM__')"
              >
                <option value="" disabled>-- Pilih Nama Anda --</option>
                <option v-for="rec in recipientsList" :key="rec" :value="rec">
                  {{ rec }}
                </option>
                <option value="__CUSTOM__">➕ Tulis Nama Lainnya (Manual)...</option>
              </select>
            </label>

            <!-- Manual Name Input if needed -->
            <label v-if="isCustom" class="block animate-fadeIn">
              <span class="label">Tulis Nama Lengkap Penerima</span>
              <input
                v-model="customRecipient"
                type="text"
                class="field bg-white uppercase font-bold"
                placeholder="Masukkan Nama Anda"
                required
              />
            </label>

            <!-- Photo Bukti Serah Terima (Optional & Recommended) -->
            <div class="pt-1">
              <div class="flex items-center justify-between mb-1.5">
                <span class="label !mb-0">Foto Bukti Serah Terima</span>
                <span class="text-[10px] text-slate-400 font-medium">Opsional (Kamera/Galeri)</span>
              </div>

              <!-- If photo selected, show preview thumbnail -->
              <div v-if="photoPreview" class="relative rounded-2xl overflow-hidden border-2 border-emerald-400 bg-slate-900 shadow-sm animate-fadeIn">
                <img :src="photoPreview" alt="Foto Serah Terima" class="w-full h-40 object-cover" />
                <div class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-2.5 flex items-center justify-between text-white text-xs">
                  <span class="font-bold text-[11px] flex items-center gap-1.5">
                    <Icon name="check" className="w-3.5 h-3.5 text-emerald-400" />
                    Foto Siap Diunggah
                  </span>
                  <button
                    type="button"
                    class="px-2.5 py-1 rounded-lg bg-rose-600/90 hover:bg-rose-700 text-[11px] font-bold transition flex items-center gap-1 shadow-sm"
                    @click="clearPhoto"
                  >
                    <Icon name="trash" className="w-3 h-3" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>

              <!-- If no photo yet, show file/camera input button -->
              <label v-else class="block cursor-pointer">
                <input
                  ref="photoInputRef"
                  class="field bg-white cursor-pointer file:mr-3 file:py-1.5 file:px-3.5 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-google-blue-50 file:text-google-blue-700 hover:file:bg-google-blue-100"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  :disabled="processingPhoto || submitting"
                  @change="onPhotoChange"
                />
                <span v-if="processingPhoto" class="text-[11px] text-google-blue-600 font-semibold flex items-center gap-1 mt-1">
                  <Icon name="refresh" className="w-3 h-3 animate-spin" />
                  Mengompresi foto...
                </span>
                <span v-else class="text-[10.5px] text-slate-400 block mt-1">
                  💡 Ambil foto bersama barang atau surat serah terima resmi (otomatis terkompresi).
                </span>
              </label>
            </div>

            <!-- Submit Button -->
            <div class="pt-3">
              <button
                type="submit"
                class="btn-success w-full min-h-[48px] !py-3.5 !text-sm !font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition active:scale-[0.98]"
                :disabled="!canSubmit"
              >
                <Icon v-if="submitting" name="refresh" className="w-4 h-4 animate-spin" />
                <Icon v-else name="check" className="w-4 h-4" />
                <span>{{ submitting ? 'Mengonfirmasi Penerimaan...' : 'Konfirmasi Penerimaan Barang' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
