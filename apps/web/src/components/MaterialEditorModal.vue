<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import Icon from './Icon.vue'
import { requestApi } from '../composables/useApi'

const props = defineProps({
  editingKpm: { type: Object, default: null },
  editItemsList: { type: Array, required: true },
  master: { type: Object, required: true },
  busy: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'add-item', 'remove-item', 'save'])

const defaultUoms = ['PCS', 'SET', 'UNIT', 'MTR', 'KG', 'LBR', 'ROLL', 'BTG', 'DUS', 'BOX']

const availableUoms = computed(() => {
  const base = (props.master?.uoms && props.master.uoms.length > 0)
    ? props.master.uoms
    : defaultUoms
  return base
})

// Material Database live search suggestions
const activeSearchIndex = ref(-1)
const suggestions = ref([])
const isSearching = ref(false)
let searchDebounce = null

async function onSearchMaterial(index, query) {
  activeSearchIndex.value = index
  if (!query || query.trim().length < 2) {
    suggestions.value = []
    return
  }
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = setTimeout(async () => {
    isSearching.value = true
    try {
      const results = await requestApi('searchMaterials', {
        method: 'GET',
        body: { query: query.trim(), limit: '8' }
      })
      if (Array.isArray(results)) {
        suggestions.value = results
      }
    } catch (e) {
      // Ignore suggestion fetch error
    } finally {
      isSearching.value = false
    }
  }, 200)
}

function selectSuggestion(item, suggestion) {
  item.nama = suggestion.nama || suggestion.deskripsi || item.nama
  if (suggestion.satuan) item.uom = suggestion.satuan
  if (suggestion.kode) item.kode = suggestion.kode
  suggestions.value = []
  activeSearchIndex.value = -1
}

function handleKeyDown(e) {
  if (e.key === 'Escape' && props.editingKpm && !props.busy) {
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
  <Transition name="modal-fade">
    <div
      v-if="editingKpm"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-md"
      @click.self="$emit('close')"
    >
      <div class="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] text-slate-800 dark:text-slate-100 transition-colors animate-scaleIn">
        <!-- Modal Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/80">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-google-blue-50 dark:bg-blue-950/60 text-google-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner">
              <Icon name="doc" className="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-800 dark:text-white">Kelola Item Material KPM</h3>
              <p class="text-xs text-google-blue-700 dark:text-blue-300 font-mono font-bold">{{ editingKpm.nomor }} &bull; {{ editingKpm.proyek || 'Line Feeding' }}</p>
            </div>
          </div>
          <button
            type="button"
            class="w-9 h-9 rounded-2xl bg-slate-200/70 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all duration-200 active:scale-90 focus-visible:outline-none"
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

            <div v-if="editItemsList.length === 0" class="py-8 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
              <p class="font-medium">Belum ada item material.</p>
              <p class="text-[11px] mt-1 text-slate-400 dark:text-slate-500">Klik tombol di bawah untuk menambahkan material baru.</p>
            </div>

            <TransitionGroup v-else name="list" tag="div" class="space-y-2.5">
              <div
                v-for="(item, idx) in editItemsList"
                :key="idx"
                class="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm"
              >
                <span class="w-6 text-center text-xs font-mono font-bold text-slate-400 dark:text-slate-500">{{ idx + 1 }}.</span>

                <div class="relative flex-1">
                  <input
                    v-model="item.nama"
                    @input="onSearchMaterial(idx, item.nama)"
                    @focus="onSearchMaterial(idx, item.nama)"
                    class="w-full field !py-2 !px-3 !text-xs !mt-0 transition-all duration-200 focus:ring-2 focus:ring-google-blue-500"
                    placeholder="Cari / isi nama atau kode material..."
                    required
                  />
                  <!-- Suggestions Dropdown -->
                  <div
                    v-if="activeSearchIndex === idx && suggestions.length > 0"
                    class="absolute left-0 right-0 top-full mt-1 z-30 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60"
                  >
                    <div
                      v-for="s in suggestions"
                      :key="s.kode || s.nama"
                      @mousedown.prevent="selectSuggestion(item, s)"
                      class="p-2 hover:bg-google-blue-50 dark:hover:bg-blue-950/50 cursor-pointer text-xs transition flex items-center justify-between gap-2"
                    >
                      <div class="truncate">
                        <span class="font-bold text-slate-800 dark:text-slate-200">{{ s.nama }}</span>
                        <span v-if="s.kode" class="ml-1 text-[10px] font-mono text-google-blue-600 dark:text-blue-400">({{ s.kode }})</span>
                      </div>
                      <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {{ s.satuan || 'PCS' }}
                      </span>
                    </div>
                  </div>
                </div>
                <input
                  v-model.number="item.qty"
                  type="number"
                  min="0.1"
                  step="any"
                  class="w-20 field !py-2 !px-3 !text-xs !mt-0 font-mono font-bold text-center transition-all duration-200 focus:ring-2 focus:ring-google-blue-500"
                  placeholder="Qty"
                  required
                />
                <select
                  v-model="item.uom"
                  class="w-24 field !py-2 !px-2 !text-xs !mt-0 font-semibold cursor-pointer transition-all duration-200 focus:ring-2 focus:ring-google-blue-500"
                >
                  <option v-for="u in availableUoms" :key="u" :value="u">{{ u }}</option>
                  <option v-if="item.uom && !availableUoms.includes(item.uom)" :value="item.uom">{{ item.uom }}</option>
                </select>
                <button
                  type="button"
                  class="btn-danger !p-2 !rounded-xl shrink-0 transition-all duration-200 active:scale-90"
                  :disabled="editItemsList.length <= 1"
                  :class="{ 'opacity-30 cursor-not-allowed': editItemsList.length <= 1 }"
                  @click="$emit('remove-item', idx)"
                  title="Hapus baris ini"
                >
                  <Icon name="trash" className="w-4 h-4" />
                </button>
              </div>
            </TransitionGroup>

            <!-- Add Item Row Button -->
            <button
              type="button"
              class="w-full py-3 rounded-2xl border-2 border-dashed border-google-blue-300 dark:border-blue-700/60 hover:border-google-blue-500 dark:hover:border-blue-500 bg-google-blue-50/50 dark:bg-blue-950/20 hover:bg-google-blue-50 dark:hover:bg-blue-950/40 text-google-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] focus-visible:outline-none"
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
              class="btn-secondary !py-2 !px-4 !text-xs !font-bold transition-all duration-200 active:scale-95"
              :disabled="busy"
              @click="$emit('close')"
            >
              Batal
            </button>
            <button
              type="submit"
              class="btn-success !py-2 !px-5 !text-xs !font-bold transition-all duration-200 active:scale-[0.98] shadow-sm hover:shadow-md"
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
  </Transition>
</template>
