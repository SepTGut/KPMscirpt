<script setup>
import { onMounted, onUnmounted } from 'vue'

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
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
    @click.self="$emit('close')"
  >
    <div class="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
      <!-- Modal Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
        <div class="flex items-center gap-2">
          <span class="text-xl">✏️</span>
          <div>
            <h3 class="text-base font-bold text-slate-800">Kelola Material KPM</h3>
            <p class="text-xs text-google-blue-700 font-mono font-bold">{{ editingKpm.nomor }} &bull; {{ editingKpm.proyek || 'Line Feeding' }}</p>
          </div>
        </div>
        <button
          type="button"
          class="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-600 flex items-center justify-center font-bold text-sm transition"
          @click="$emit('close')"
          title="Tutup (Esc)"
        >
          ✕
        </button>
      </div>

      <!-- Modal Form -->
      <form @submit.prevent="$emit('save')" class="flex flex-col flex-1 overflow-hidden">
        <!-- Modal Body -->
        <div class="p-6 overflow-y-auto space-y-3 flex-1">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-bold text-slate-700">Daftar Item Material ({{ editItemsList.length }})</span>
            <span class="text-[11px] text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 font-semibold">
              Status: {{ editingKpm.status }}
            </span>
          </div>

          <div
            v-for="(item, idx) in editItemsList"
            :key="idx"
            class="flex items-center gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200/80 transition-all hover:border-slate-300"
          >
            <span class="w-6 text-center text-xs font-mono font-bold text-slate-400">{{ idx + 1 }}.</span>

            <input
              v-model="item.nama"
              class="flex-1 field !py-1.5 !px-3 !text-xs !bg-white"
              placeholder="Nama / Spesifikasi material..."
              required
            />
            <input
              v-model.number="item.qty"
              type="number"
              min="0.1"
              step="any"
              class="w-20 field !py-1.5 !px-3 !text-xs !bg-white font-mono font-bold text-center"
              placeholder="Qty"
              required
            />
            <select
              v-model="item.uom"
              class="w-24 field !py-1.5 !px-2 !text-xs !bg-white font-semibold cursor-pointer"
            >
              <option v-for="u in master.uoms" :key="u" :value="u">{{ u }}</option>
            </select>
            <button
              type="button"
              class="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-sm border border-rose-200 transition"
              :disabled="editItemsList.length <= 1"
              :class="{ 'opacity-30 cursor-not-allowed': editItemsList.length <= 1 }"
              @click="$emit('remove-item', idx)"
              title="Hapus baris ini"
            >
              ✕
            </button>
          </div>

          <!-- Add Item Row Button -->
          <button
            type="button"
            class="w-full py-2.5 rounded-2xl border-2 border-dashed border-google-blue-300 hover:border-google-blue-500 bg-google-blue-50/50 hover:bg-google-blue-50 text-google-blue-700 text-xs font-bold flex items-center justify-center gap-2 transition"
            @click="$emit('add-item')"
          >
            <span class="text-sm font-bold">+</span>
            <span>Tambah Baris Material Baru</span>
          </button>
        </div>

        <!-- Modal Footer -->
        <div class="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
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
            class="btn-primary !py-2 !px-5 !text-xs !font-bold !bg-google-green-600 hover:!bg-google-green-700 shadow-md"
            :disabled="busy"
          >
            <span v-if="busy" class="animate-spin inline-block mr-1">↻</span>
            <span>{{ busy ? 'Menyimpan...' : '💾 Simpan Perubahan Material' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
