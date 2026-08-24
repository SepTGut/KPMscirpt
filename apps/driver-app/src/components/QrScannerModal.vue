<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
    <div class="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-3xl p-5 shadow-2xl overflow-hidden flex flex-col items-center text-center">
      <!-- Header -->
      <div class="w-full flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
        <div class="flex items-center gap-2">
          <QrCode class="w-5 h-5 text-sky-400" />
          <h3 class="text-sm font-bold text-white">Scan Barcode / QR KPM</h3>
        </div>
        <button
          @click="stopAndClose"
          class="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <p class="text-xs text-slate-400 mb-4">
        Arahkan kamera ke lembar cetak dokumen KPM untuk membuka otomatis.
      </p>

      <!-- Viewfinder Reader Element -->
      <div class="w-full relative rounded-2xl overflow-hidden bg-black aspect-square border-2 border-sky-500/50 shadow-inner flex items-center justify-center">
        <div id="qr-reader" class="w-full h-full"></div>
        <div v-if="isLoading" class="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 text-sky-400 gap-2">
          <Loader2 class="w-6 h-6 animate-spin" />
          <span class="text-xs font-semibold">Menyalakan kamera...</span>
        </div>
        <!-- Scan targeting crosshair overlay -->
        <div class="absolute inset-8 pointer-events-none border border-sky-400/30 rounded-xl">
          <div class="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-sky-400"></div>
          <div class="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-sky-400"></div>
          <div class="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-sky-400"></div>
          <div class="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-sky-400"></div>
        </div>
      </div>

      <div v-if="scanError" class="mt-3 p-2 bg-rose-500/20 text-rose-300 text-[11px] rounded-lg border border-rose-500/30">
        {{ scanError }}
      </div>

      <!-- Close Action -->
      <button
        @click="stopAndClose"
        class="w-full mt-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
      >
        Tutup Scanner
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'
import { X, QrCode, Loader2 } from 'lucide-vue-next'
import { Html5Qrcode } from 'html5-qrcode'
import { playBeep, triggerVibration } from '../services/feedback'

const props = defineProps({
  isOpen: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'scanned'])

let html5QrCode = null
const isLoading = ref(false)
const scanError = ref('')

watch(() => props.isOpen, async (newVal) => {
  if (newVal) {
    scanError.value = ''
    isLoading.value = true
    setTimeout(startScanner, 200)
  } else {
    stopScanner()
  }
})

async function startScanner() {
  try {
    html5QrCode = new Html5Qrcode('qr-reader')
    const config = { fps: 10, qrbox: { width: 220, height: 220 } }

    await html5QrCode.start(
      { facingMode: 'environment' },
      config,
      (decodedText) => {
        playBeep('scan')
        triggerVibration([80, 50, 80])
        emit('scanned', decodedText)
        stopAndClose()
      },
      () => {}
    )
    isLoading.value = false
  } catch (err) {
    isLoading.value = false
    scanError.value = 'Izin kamera ditolak atau kamera tidak tersedia.'
  }
}

async function stopScanner() {
  if (html5QrCode && html5QrCode.isScanning) {
    try {
      await html5QrCode.stop()
      await html5QrCode.clear()
    } catch (e) {}
    html5QrCode = null
  }
}

function stopAndClose() {
  stopScanner()
  emit('close')
}

onBeforeUnmount(() => {
  stopScanner()
})
</script>
