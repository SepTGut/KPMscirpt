<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
    <div class="bg-google-surface-900 border border-google-surface-700 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-m3-4 flex flex-col max-h-[85vh]">
      <!-- Bottom Sheet Grab Handle Bar -->
      <div class="w-12 h-1 bg-google-surface-600 rounded-full mx-auto sm:hidden mb-2"></div>

      <!-- Header -->
      <div class="flex items-center justify-between pb-3 border-b border-google-surface-700">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-2xl bg-google-yellow-500/20 text-google-yellow-300 flex items-center justify-center border border-google-yellow-500/30">
            <CloudUpload class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-white">Antrean Offline</h3>
            <p class="text-[11px] text-google-surface-300">{{ items.length }} pembaruan menunggu sinyal</p>
          </div>
        </div>
        <button
          @click="$emit('close')"
          class="w-8 h-8 rounded-full bg-google-surface-800 text-google-surface-300 hover:text-white flex items-center justify-center transition"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Items List -->
      <div class="flex-1 overflow-y-auto py-3 space-y-2.5">
        <div v-if="!items.length" class="py-8 text-center text-google-surface-300 text-xs">
          Tidak ada antrean pending. Semua data telah terkirim!
        </div>

        <div
          v-for="item in items"
          :key="item.id"
          class="bg-google-surface-800/80 border border-google-surface-700/60 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs shadow-sm"
        >
          <div class="min-w-0">
            <div class="font-bold text-google-blue-400 font-mono text-[11px]">{{ item.nomorKPM }}</div>
            <div class="text-white font-semibold mt-0.5">Status: {{ item.statusKPM }}</div>
            <div class="text-[10px] text-google-surface-300 mt-0.5">{{ new Date(item.createdAt).toLocaleTimeString() }} · PIC: {{ item.namaPIC || '-' }}</div>
          </div>
          <span class="px-2.5 py-1 bg-google-yellow-500/20 text-google-yellow-300 border border-google-yellow-500/40 rounded-full text-[10px] font-bold shrink-0">
            Pending
          </span>
        </div>
      </div>

      <!-- Action Buttons (M3 Pills) -->
      <div class="pt-3 border-t border-google-surface-700 flex gap-2.5">
        <button
          @click="clearAll"
          v-if="items.length > 0"
          :disabled="isSyncing"
          class="py-3 px-3.5 rounded-full bg-google-surface-800 hover:bg-google-red-900/30 text-google-surface-300 hover:text-google-red-300 text-xs font-semibold transition border border-google-surface-600"
          title="Hapus semua"
        >
          <Trash2 class="w-4 h-4" />
        </button>
        <button
          @click="$emit('sync')"
          :disabled="isSyncing || items.length === 0"
          class="flex-1 py-3 rounded-full bg-gradient-to-r from-google-blue-600 via-indigo-600 to-google-blue-500 hover:from-google-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-m3-2 transition flex items-center justify-center gap-2 disabled:opacity-50 ring-1 ring-white/10"
        >
          <Loader2 v-if="isSyncing" class="w-4 h-4 animate-spin" />
          <CloudUpload v-else class="w-4 h-4" />
          <span>{{ isSyncing ? 'Mengunggah Antrean...' : 'Unggah Sekarang (Sync)' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { X, CloudUpload, Trash2, Loader2 } from 'lucide-vue-next'
import { clearPendingUpdates } from '../services/offlineQueue'

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  items: { type: Array, default: () => [] },
  isSyncing: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'sync', 'cleared'])

async function clearAll() {
  if (!confirm('Hapus semua antrean offline yang belum terkirim?')) return
  await clearPendingUpdates()
  emit('cleared')
}
</script>

