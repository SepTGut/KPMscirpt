<script setup>
import { onMounted, onUnmounted } from 'vue'
import Icon from './Icon.vue'

const props = defineProps({
  editingKpm: { type: Object, default: null },
  editItemsList: { type: Array, required: true },
  master: { type: Object, required: true },
  busy: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'add-item', 'remove-item', 'save'])

function handleKeyDown(e) {
  if (e.key === 'Escape' && props.editingKpm) {
    emit('close')
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <div
    v-if="editingKpm"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn"
    @click.self="$emit('close')"
  >
    <div class="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] text-slate-800 dark:text-slate-100 transition-colors">
      <!-- Modal Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/80">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-google-blue-50 dark:bg-blue-950/60 text-google-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Icon name="doc" className="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-base font-bold text-slate-800 dark:text-white">Kelola Item Material KPM</h3>
            <p class="text-xs text-google-blue-700 dark:text-blue-300 font-mono font-bold">{{ editingKpm.nomor }} &bull; {{ editingKpm.proyek || 'Line Feeding' }}</p>
          </div>
        </div>
        <button
          type="button"
          class="w-8 h-8 rounded-full bg-slate-200/70 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 flex items-center justify-center transition focus-visible:outline-none"
          @click="$emit('close')"
          title="Tutup (Esc)"
        >
          <Icon name="close" className="w-4 h-4" />
        </button>
      </div>

      <!-- Modal Form -->
      <form @submit.prevent="$emit('save')" class="flex flex-col flex-1 overflow-hidden">
        <!-- Modal Body -->
        <div class="p-6 overflow-y-auto space-y-3 flex-1">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-bold text-slate-700 dark:text-slate-200">Daftar Item Material ({{ editItemsList.length }})</span>
            <span class="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 font-semibold">
              Status: {{ editingKpm.status }}
            </span>
          </div>

          <div
            v-for="(item, idx) in editItemsList"
            :key="idx"
            class="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 transition-all hover:border-slate-300 dark:hover:border-slate-600"
          >
            <span class="w-6 text-center text-xs font-mono font-bold text-slate-400 dark:text-slate-500">{{ idx + 1 }}.</span>

            <input
              v-model="item.nama"
              class="flex-1 field !py-2 !px-3 !text-xs !mt-0"
              placeholder="Nama / Spesifikasi material..."
              required
            />
            <input
              v-model.number="item.qty"
              type="number"
              min="0.1"
              step="any"
              class="w-20 field !py-2 !px-3 !text-xs !mt-0 font-mono font-bold text-center"
              placeholder="Qty"
              required
            />
            <select
              v-model="item.uom"
              class="w-24 field !py-2 !px-2 !text-xs !mt-0 font-semibold cursor-pointer"
            >
              <option v-for="u in master.uoms" :key="u" :value="u">{{ u }}</option>
            </select>
            <button
              type="button"
              class="btn-danger !p-2 !rounded-xl shrink-0"
              :disabled="editItemsList.length <= 1"
              :class="{ 'opacity-30 cursor-not-allowed': editItemsList.length <= 1 }"
              @click="$emit('remove-item', idx)"
              title="Hapus baris ini"
            >
              <Icon name="trash" className="w-4 h-4" />
            </button>
          </div>

          <!-- Add Item Row Button -->
          <button
            type="button"
            class="w-full py-2.5 rounded-2xl border-2 border-dashed border-google-blue-300 dark:border-blue-700/60 hover:border-google-blue-500 dark:hover:border-blue-500 bg-google-blue-50/50 dark:bg-blue-950/20 hover:bg-google-blue-50 dark:hover:bg-blue-950/40 text-google-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center gap-1.5 transition focus-visible:outline-none"
            @click="$emit('add-item')"
          >
            <Icon name="plus" className="w-4 h-4" />
            <span>Tambah Baris Material Baru</span>
          </button>
        </div>

        <!-- Modal Footer -->
        <div class="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-end gap-3">
          <button
            type="button"
            class="btn-secondary !py-2 !px-4 !text-xs !font-bold"
            :disabled="busy"
            @click="$emit('close')"
          >
            Batal
          </button>
          <button
            type="submit"
            class="btn-success !py-2 !px-5 !text-xs !font-bold"
            :disabled="busy"
          >
            <Icon v-if="busy" name="refresh" className="w-3.5 h-3.5 animate-spin mr-1" />
            <Icon v-else name="check" className="w-3.5 h-3.5 mr-1" />
            <span>{{ busy ? 'Menyimpan...' : 'Simpan Perubahan Material' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
