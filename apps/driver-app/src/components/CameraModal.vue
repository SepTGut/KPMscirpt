<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
    <div class="bg-google-surface-900 border border-google-surface-700 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-m3-4 overflow-hidden max-h-[92vh] flex flex-col">
      <!-- Bottom Sheet Grab Handle Bar -->
      <div class="w-12 h-1 bg-google-surface-600 rounded-full mx-auto sm:hidden mb-2"></div>

      <!-- Header -->
      <div class="flex items-center justify-between pb-3 border-b border-google-surface-700">
        <div>
          <span class="text-[10px] font-bold text-google-blue-400 uppercase tracking-wider font-mono">
            {{ targetDelivery?.nomor || targetDelivery?.kpmId }}
          </span>
          <h3 class="text-base font-bold text-white">
            {{ isTiba ? 'Bukti Ketibaan (Selesai)' : 'Bukti Muat (Keberangkatan)' }}
          </h3>
        </div>
        <button
          @click="$emit('close')"
          :disabled="isSubmitting"
          class="w-8 h-8 rounded-full bg-google-surface-800 text-google-surface-300 hover:text-white flex items-center justify-center disabled:opacity-50 transition"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Route Stepper Pill (Google Blue origin -> Google Green dest) -->
      <div class="my-3 py-2 px-3 bg-google-surface-800/80 rounded-xl border border-google-surface-700/60 flex items-center justify-between text-xs">
        <span class="text-slate-200 font-semibold truncate flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-google-blue-400"></span>
          {{ targetDelivery?.wsAwal }}
        </span>
        <ArrowRight class="w-3.5 h-3.5 text-google-blue-400 shrink-0 mx-2" />
        <span class="text-google-green-400 font-semibold truncate flex items-center gap-1">
          {{ targetDelivery?.wsTujuan }}
          <span class="w-1.5 h-1.5 rounded-full bg-google-green-400"></span>
        </span>
      </div>

      <!-- Error notice (Google Red) -->
      <div v-if="errorMessage" class="mb-3 p-3 bg-google-red-900/30 border border-google-red-600/50 rounded-2xl text-google-red-200 text-xs flex items-center gap-2">
        <AlertCircle class="w-4 h-4 shrink-0 text-google-red-400" />
        <span>{{ errorMessage }}</span>
      </div>

      <!-- Photo Picker / Preview -->
      <div class="flex-1 overflow-y-auto py-2">
        <div
          v-if="!photoDataUrl"
          @click="triggerFileInput"
          class="border-2 border-dashed border-google-blue-500/50 hover:border-google-blue-400 bg-google-surface-800/40 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition active:scale-[0.99] min-h-[180px] shadow-inner"
        >
          <div class="w-12 h-12 rounded-2xl bg-google-blue-500/20 text-google-blue-400 flex items-center justify-center mb-3">
            <Camera class="w-6 h-6" />
          </div>
          <span class="text-xs font-bold text-white mb-1">Ambil Foto Bukti Kamera</span>
          <span class="text-[11px] text-google-surface-300">Tekan di sini untuk membuka kamera HP</span>
        </div>

        <div v-else class="relative rounded-2xl overflow-hidden border border-google-surface-700 bg-black max-h-[260px] flex items-center justify-center">
          <img :src="photoDataUrl" alt="Preview Bukti" class="w-full h-auto object-contain max-h-[260px]" />
          <button
            @click="clearPhoto"
            :disabled="isSubmitting"
            class="absolute top-2 right-2 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-google-red-300 border border-google-red-500/40 text-xs font-bold flex items-center gap-1 hover:bg-black/90 transition"
          >
            <RotateCcw class="w-3.5 h-3.5" />
            <span>Foto Ulang</span>
          </button>
        </div>

        <!-- Hidden Native File Inputs -->
        <input
          ref="cameraInput"
          type="file"
          accept="image/*"
          capture="environment"
          @change="onFileSelected"
          class="hidden"
        />
        <input
          ref="galleryInput"
          type="file"
          accept="image/*"
          @change="onFileSelected"
          class="hidden"
        />

        <div v-if="!photoDataUrl" class="flex justify-center gap-3 mt-3">
          <button
            type="button"
            @click="triggerCamera"
            class="text-[11px] font-semibold text-google-blue-400 flex items-center gap-1 hover:underline py-1"
          >
            <Camera class="w-3.5 h-3.5" /> Kamera HP
          </button>
          <span class="text-google-surface-500">·</span>
          <button
            type="button"
            @click="triggerGallery"
            class="text-[11px] font-semibold text-google-surface-300 flex items-center gap-1 hover:underline py-1"
          >
            <ImageIcon class="w-3.5 h-3.5" /> Galeri File
          </button>
        </div>

        <!-- PIC Selector & GPS Badge -->
        <div class="mt-4 space-y-2">
          <div>
            <label class="block text-[11px] font-bold text-google-surface-200 mb-1">Nama PIC Pengemudi / Personel</label>
            <input
              v-model="driverName"
              type="text"
              placeholder="Contoh: AANG / EKO"
              class="w-full px-3.5 py-2.5 rounded-xl bg-google-surface-800 border border-google-surface-600 text-white text-xs placeholder:text-google-surface-400 focus:outline-none focus:border-google-blue-400 focus:ring-2 focus:ring-google-blue-500/20 uppercase transition"
            />
          </div>

          <!-- GPS Checkpoint Badge -->
          <div class="flex items-center justify-between px-3 py-1.5 bg-google-surface-800/80 rounded-xl border border-google-surface-700 text-[11px]">
            <span class="text-slate-400 flex items-center gap-1.5">
              <span>📍</span>
              <span>Lokasi GPS Checkpoint:</span>
            </span>
            <span v-if="gpsCoords" class="text-emerald-400 font-mono font-bold">
              {{ gpsCoords.latitude.toFixed(4) }}, {{ gpsCoords.longitude.toFixed(4) }} (±{{ Math.round(gpsCoords.accuracy || 0) }}m)
            </span>
            <span v-else class="text-amber-400 font-medium animate-pulse">
              Mencari sinyal GPS...
            </span>
          </div>
        </div>
      </div>

      <!-- Footer Buttons (M3 Pills) -->
      <div class="pt-3 border-t border-google-surface-700 flex gap-2.5">
        <button
          @click="$emit('close')"
          :disabled="isSubmitting"
          class="flex-1 py-3 rounded-full bg-google-surface-800 hover:bg-google-surface-700 text-slate-300 font-bold text-xs transition disabled:opacity-50 border border-google-surface-600"
        >
          Batal
        </button>
        <button
          @click="submit"
          :disabled="isSubmitting || !photoDataUrl"
          class="flex-[2] py-3 rounded-full font-bold text-xs text-white shadow-m3-2 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ring-1 ring-white/10"
          :class="isTiba ? 'bg-gradient-to-r from-google-green-600 to-teal-600 hover:from-google-green-500 hover:to-teal-500 shadow-google-green-500/25' : 'bg-gradient-to-r from-google-blue-600 via-indigo-600 to-google-blue-500 hover:from-google-blue-500 hover:to-indigo-500 shadow-google-blue-500/25'"
        >
          <Loader2 v-if="isSubmitting" class="w-4 h-4 animate-spin" />
          <CheckCircle2 v-else class="w-4 h-4" />
          <span>{{ isSubmitting ? 'Mengirim Data...' : (isTiba ? 'Kirim Konfirmasi Tiba' : 'Kirim Mulai Berangkat') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { X, ArrowRight, AlertCircle, Camera, Image as ImageIcon, RotateCcw, Loader2, CheckCircle2 } from 'lucide-vue-next'
import { compressImage } from '../services/imageCompressor'
import { getCurrentCoordinates, clearFirebaseTracking } from '../services/trackingService'

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  targetDelivery: { type: Object, default: null },
  isSubmitting: { type: Boolean, default: false },
  errorMessage: { type: String, default: '' }
})

const emit = defineEmits(['close', 'submit'])

const cameraInput = ref(null)
const galleryInput = ref(null)
const photoDataUrl = ref('')
const driverName = ref('')
const gpsCoords = ref(null)

const isTiba = computed(() => props.targetDelivery?.status === 'Jalan')

watch(() => props.isOpen, async (newVal) => {
  if (newVal) {
    photoDataUrl.value = ''
    driverName.value = props.targetDelivery?.pic || localStorage.getItem('last_driver_pic') || ''
    gpsCoords.value = null
    try {
      gpsCoords.value = await getCurrentCoordinates()
    } catch (e) {
      console.warn('GPS read warning:', e)
    }
  }
})

function triggerFileInput() {
  triggerCamera()
}

function triggerCamera() {
  cameraInput.value?.click()
}

function triggerGallery() {
  galleryInput.value?.click()
}

async function onFileSelected(event) {
  const file = event.target.files?.[0]
  if (!file) return

  try {
    const compressed = await compressImage(file, 1000, 0.72)
    photoDataUrl.value = compressed
    // Refresh GPS on photo selection if missing
    if (!gpsCoords.value) {
      getCurrentCoordinates().then(c => { gpsCoords.value = c }).catch(() => {})
    }
  } catch (err) {
    alert(err.message || 'Gagal memproses gambar.')
  }
}

function clearPhoto() {
  photoDataUrl.value = ''
  if (cameraInput.value) cameraInput.value.value = ''
  if (galleryInput.value) galleryInput.value.value = ''
}

async function submit() {
  if (!photoDataUrl.value) return
  if (driverName.value) {
    localStorage.setItem('last_driver_pic', driverName.value.trim().toUpperCase())
  }
  const kpmId = props.targetDelivery?.nomor || props.targetDelivery?.kpmId
  const statusKPM = isTiba.value ? 'Tiba' : 'Jalan'

  if (statusKPM === 'Tiba') {
    clearFirebaseTracking(kpmId)
  }

  emit('submit', {
    nomorKPM: kpmId,
    statusKPM: statusKPM,
    fotoData: photoDataUrl.value,
    namaPIC: driverName.value.trim().toUpperCase(),
    lokasiWorkshop: `${props.targetDelivery?.wsAwal || ''} ➔ ${props.targetDelivery?.wsTujuan || ''}`,
    latitude: gpsCoords.value?.latitude || '',
    longitude: gpsCoords.value?.longitude || ''
  })
}
</script>

<style scoped>
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fadeIn {
  animation: fadeIn 0.2s ease-out;
}
</style>
