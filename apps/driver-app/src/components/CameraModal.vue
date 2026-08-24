<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
    <div class="bg-slate-900 border border-slate-700 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <span class="text-[10px] font-bold text-sky-400 uppercase tracking-wider font-mono">
            {{ targetDelivery?.nomor || targetDelivery?.kpmId }}
          </span>
          <h3 class="text-base font-bold text-white">
            {{ isTiba ? 'Bukti Ketibaan (Selesai)' : 'Bukti Muat (Keberangkatan)' }}
          </h3>
        </div>
        <button
          @click="$emit('close')"
          :disabled="isSubmitting"
          class="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center disabled:opacity-50"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Route pill -->
      <div class="my-3 py-2 px-3 bg-slate-800/80 rounded-xl border border-slate-700/60 flex items-center justify-between text-xs">
        <span class="text-slate-300 font-semibold truncate">{{ targetDelivery?.wsAwal }}</span>
        <ArrowRight class="w-3.5 h-3.5 text-sky-400 shrink-0 mx-2" />
        <span class="text-emerald-400 font-semibold truncate">{{ targetDelivery?.wsTujuan }}</span>
      </div>

      <!-- Error notice -->
      <div v-if="errorMessage" class="mb-3 p-2.5 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2">
        <AlertCircle class="w-4 h-4 shrink-0" />
        <span>{{ errorMessage }}</span>
      </div>

      <!-- Photo Picker / Preview -->
      <div class="flex-1 overflow-y-auto py-2">
        <div
          v-if="!photoDataUrl"
          @click="triggerFileInput"
          class="border-2 border-dashed border-slate-700 hover:border-sky-500 bg-slate-800/40 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition active:scale-[0.99] min-h-[180px]"
        >
          <div class="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center mb-3">
            <Camera class="w-6 h-6" />
          </div>
          <span class="text-xs font-bold text-white mb-1">Ambil Foto Bukti Kamera</span>
          <span class="text-[11px] text-slate-400">Tekan di sini untuk membuka kamera HP</span>
        </div>

        <div v-else class="relative rounded-2xl overflow-hidden border border-slate-700 bg-black max-h-[260px] flex items-center justify-center">
          <img :src="photoDataUrl" alt="Preview Bukti" class="w-full h-auto object-contain max-h-[260px]" />
          <button
            @click="clearPhoto"
            :disabled="isSubmitting"
            class="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center gap-1 hover:bg-black/80"
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
            class="text-[11px] font-semibold text-sky-400 flex items-center gap-1 hover:underline py-1"
          >
            <Camera class="w-3.5 h-3.5" /> Kamera HP
          </button>
          <span class="text-slate-600">·</span>
          <button
            type="button"
            @click="triggerGallery"
            class="text-[11px] font-semibold text-slate-400 flex items-center gap-1 hover:underline py-1"
          >
            <ImageIcon class="w-3.5 h-3.5" /> Galeri File
          </button>
        </div>

        <!-- PIC Selector -->
        <div class="mt-4">
          <label class="block text-[11px] font-bold text-slate-300 mb-1">Nama PIC Pengemudi / Personel</label>
          <input
            v-model="driverName"
            type="text"
            placeholder="Contoh: AANG / EKO"
            class="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      <!-- Footer Buttons -->
      <div class="pt-3 border-t border-slate-800 flex gap-2">
        <button
          @click="$emit('close')"
          :disabled="isSubmitting"
          class="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition disabled:opacity-50"
        >
          Batal
        </button>
        <button
          @click="submit"
          :disabled="isSubmitting || !photoDataUrl"
          class="flex-[2] py-3 rounded-xl font-bold text-xs text-white shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          :class="isTiba ? 'bg-gradient-to-r from-emerald-600 to-teal-500' : 'bg-gradient-to-r from-sky-600 to-blue-600'"
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

const isTiba = computed(() => props.targetDelivery?.status === 'Jalan')

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    photoDataUrl.value = ''
    driverName.value = props.targetDelivery?.pic || localStorage.getItem('last_driver_pic') || ''
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
  } catch (err) {
    alert(err.message || 'Gagal memproses gambar.')
  }
}

function clearPhoto() {
  photoDataUrl.value = ''
  if (cameraInput.value) cameraInput.value.value = ''
  if (galleryInput.value) galleryInput.value.value = ''
}

function submit() {
  if (!photoDataUrl.value) return
  if (driverName.value) {
    localStorage.setItem('last_driver_pic', driverName.value.trim().toUpperCase())
  }
  emit('submit', {
    nomorKPM: props.targetDelivery?.nomor || props.targetDelivery?.kpmId,
    statusKPM: isTiba.value ? 'Tiba' : 'Jalan',
    fotoData: photoDataUrl.value,
    namaPIC: driverName.value.trim().toUpperCase(),
    lokasiWorkshop: `${props.targetDelivery?.wsAwal || ''} ➔ ${props.targetDelivery?.wsTujuan || ''}`
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
