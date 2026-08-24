<template>
  <header class="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3">
    <div class="max-w-md mx-auto flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-sky-400 flex items-center justify-center shadow-lg shadow-sky-500/20">
          <Truck class="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 class="text-base font-bold tracking-tight text-white leading-tight">Driver Portal</h1>
          <div class="flex items-center gap-1.5 mt-0.5">
            <span class="w-2 h-2 rounded-full" :class="isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'"></span>
            <span class="text-[11px] font-medium text-slate-400">{{ isOnline ? 'Online' : 'Offline Mode' }}</span>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <!-- Offline queue badge -->
        <button
          v-if="pendingCount > 0"
          @click="$emit('openQueue')"
          class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold animate-bounce"
        >
          <CloudUpload class="w-3.5 h-3.5" />
          <span>{{ pendingCount }}</span>
        </button>

        <!-- QR Scanner Button -->
        <button
          @click="$emit('openScanner')"
          class="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 transition flex items-center justify-center"
          title="Scan QR KPM"
        >
          <QrCode class="w-5 h-5 text-sky-400" />
        </button>

        <!-- Refresh Button -->
        <button
          @click="$emit('refresh')"
          :disabled="isRefreshing"
          class="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 transition flex items-center justify-center disabled:opacity-50"
          title="Refresh Data"
        >
          <RotateCw class="w-5 h-5" :class="{ 'animate-spin text-sky-400': isRefreshing }" />
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
