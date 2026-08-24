<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
    <div class="bg-slate-900 border border-slate-700 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl flex flex-col max-h-[85vh]">
      <!-- Header -->
      <div class="flex items-center justify-between pb-3 border-b border-slate-800">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center">
            <CloudUpload class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-white">Antrean Offline</h3>
            <p class="text-[11px] text-slate-400">{{ items.length }} pembaruan menunggu sinyal</p>
          </div>
        </div>
        <button
          @click="$emit('close')"
          class="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Items List -->
      <div class="flex-1 overflow-y-auto py-3 space-y-2">
        <div v-if="!items.length" class="py-8 text-center text-slate-500 text-xs">
          Tidak ada antrean pending. Semua data telah terkirim!
        </div>

        <div
          v-for="item in items"
          :key="item.id"
          class="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex items-center justify-between gap-3 text-xs"
        >
          <div class="min-w-0">
            <div class="font-bold text-sky-400 font-mono text-[11px]">{{ item.nomorKPM }}</div>
            <div class="text-white font-semibold mt-0.5">Status: {{ item.statusKPM }}</div>
            <div class="text-[10px] text-slate-400 mt-0.5">{{ new Date(item.createdAt).toLocaleTimeString() }} · PIC: {{ item.namaPIC || '-' }}</div>
          </div>
          <span class="px-2 py-1 bg-amber-500/20 text-amber-300 rounded text-[10px] font-bold shrink-0">
            Pending
          </span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="pt-3 border-t border-slate-800 flex gap-2">
        <button
          @click="clearAll"
          v-if="items.length > 0"
          :disabled="isSyncing"
          class="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 text-xs font-semibold transition"
        >
          <Trash2 class="w-4 h-4" />
        </button>
        <button
          @click="$emit('sync')"
          :disabled="isSyncing || items.length === 0"
          class="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
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
