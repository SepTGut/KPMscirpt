<template>
  <header class="sticky top-0 z-30 bg-google-surface-900/90 backdrop-blur-md border-b border-google-surface-700/80 px-4 py-3 shadow-m3-1">
    <div class="max-w-md mx-auto flex items-center justify-between">
      <div class="flex items-center gap-3">
        <!-- Google AI / Modern Gradient Emblem -->
        <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-google-blue-600 via-indigo-500 to-google-green-500 flex items-center justify-center shadow-lg shadow-google-blue-500/25 ring-1 ring-white/20">
          <Truck class="w-5 h-5 text-white" />
        </div>
        <div>
          <div class="flex items-center gap-1.5">
            <h1 class="text-base font-bold tracking-tight text-white leading-tight">Driver Portal</h1>
            <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-google-blue-500/20 text-google-blue-300 border border-google-blue-500/30">M3</span>
          </div>
          <div class="flex items-center gap-1.5 mt-0.5">
            <span class="w-2 h-2 rounded-full" :class="isOnline ? 'bg-google-green-400 animate-pulse ring-2 ring-google-green-400/30' : 'bg-google-yellow-400'"></span>
            <span class="text-[11px] font-medium text-google-surface-200">{{ isOnline ? 'Online' : 'Offline Mode' }}</span>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <!-- Offline queue badge (Google Yellow / Optimism) -->
        <button
          v-if="pendingCount > 0"
          @click="$emit('openQueue')"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-google-yellow-500/20 text-google-yellow-300 border border-google-yellow-500/40 text-xs font-bold animate-bounce shadow-sm hover:bg-google-yellow-500/30 transition"
        >
          <CloudUpload class="w-3.5 h-3.5" />
          <span>{{ pendingCount }}</span>
        </button>

        <!-- QR Scanner Button (Google Blue / Trust) -->
        <button
          @click="$emit('openScanner')"
          class="w-10 h-10 rounded-full bg-google-surface-800 hover:bg-google-surface-700 active:scale-95 text-google-blue-400 border border-google-surface-600 transition flex items-center justify-center shadow-m3-1 hover:border-google-blue-500/50"
          title="Scan QR KPM"
        >
          <QrCode class="w-5 h-5 text-google-blue-400" />
        </button>

        <!-- Refresh Button -->
        <button
          @click="$emit('refresh')"
          :disabled="isRefreshing"
          class="w-10 h-10 rounded-full bg-google-surface-800 hover:bg-google-surface-700 active:scale-95 text-slate-200 border border-google-surface-600 transition flex items-center justify-center disabled:opacity-50 shadow-m3-1"
          title="Refresh Data"
        >
          <RotateCw class="w-4 h-4 text-slate-300" :class="{ 'animate-spin text-google-blue-400': isRefreshing }" />
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { Truck, QrCode, RotateCw, CloudUpload } from 'lucide-vue-next'

defineProps({
  isOnline: { type: Boolean, default: true },
  pendingCount: { type: Number, default: 0 },
  isRefreshing: { type: Boolean, default: false }
})

defineEmits(['openScanner', 'openQueue', 'refresh'])
</script>

