<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import Icon from './Icon.vue'
import { useKpm, sanitizeSpreadsheetInput } from '../composables/useKpm'
import { useToast } from '../composables/useToast'

const props = defineProps({
  master: { type: Object, required: true },
  busy: { type: Boolean, default: false },
  isIT: { type: Boolean, default: false }
})

const emit = defineEmits(['create'])
const { saveDraft, loadDraft, clearDraft } = useKpm()
const toast = useToast()

const availableWorkshops = computed(() => {
  const base = props.master?.workshops || []
  if (props.isIT) {
    const list = [...base]
    if (!list.includes('Test0')) list.push('Test0')
    if (!list.includes('Test1')) list.push('Test1')
    return list
  }
  return base.filter(w => w !== 'Test0' && w !== 'Test1')
})

const availablePics = computed(() => {
  const base = props.master?.pics || []
  if (props.isIT) {
    const list = [...base]
    if (!list.includes('IT')) list.push('IT')
    if (!list.includes('ST')) list.push('ST')
    return list
  }
  return base.filter(p => p !== 'IT' && p !== 'ST')
})

const form = ref({
  lokasiBerangkat: '',
  lokasiTiba: '',
  namaPIC: '',
  namaProyek: '',
  items: [{ nama: '', qty: 1, uom: 'PCS' }],
})

const hasRestoredDraft = ref(false)

onMounted(() => {
  const draft = loadDraft()
  if (draft && (draft.lokasiBerangkat || draft.lokasiTiba || draft.namaPIC || draft.namaProyek || (draft.items && draft.items.length > 0 && draft.items[0].nama))) {
    form.value = draft
    hasRestoredDraft.value = true
  }
})

// Auto-save draft changes
watch(form, (newVal) => {
  if (newVal.lokasiBerangkat || newVal.lokasiTiba || newVal.namaPIC || newVal.namaProyek || newVal.items?.[0]?.nama) {
    saveDraft(newVal)
  }
}, { deep: true })

function resetForm() {
  clearDraft()
  hasRestoredDraft.value = false
  form.value = {
    lokasiBerangkat: '',
    lokasiTiba: '',
    namaPIC: '',
    namaProyek: '',
    items: [{ nama: '', qty: 1, uom: props.master.uoms?.[0] || 'PCS' }],
  }
}

function addItem() {
  form.value.items.push({ nama: '', qty: 1, uom: props.master.uoms?.[0] || 'PCS' })
}

function removeItem(index) {
  if (form.value.items.length > 1) form.value.items.splice(index, 1)
}

function submit() {
  if (!form.value.lokasiBerangkat || !form.value.lokasiTiba || !form.value.namaPIC) {
    toast.warning('Harap lengkapi lokasi asal, tujuan, dan PIC pengirim.')
    return
  }
  if (!form.value.items.every(item => item.nama?.trim() && Number(item.qty) > 0)) {
    toast.warning('Setiap baris material wajib memiliki deskripsi dan kuantitas lebih dari 0.')
    return
  }

  emit('create', { ...form.value })
  clearDraft()
  hasRestoredDraft.value = false
  form.value = {
    lokasiBerangkat: '',
    lokasiTiba: '',
    namaPIC: '',
    namaProyek: '',
    items: [{ nama: '', qty: 1, uom: props.master.uoms?.[0] || 'PCS' }],
  }
}
</script>

<template>
  <form class="panel space-y-6" @submit.prevent="submit">
    <!-- Draft Restored Banner -->
    <div
      v-if="hasRestoredDraft"
      class="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-300 flex items-center justify-between shadow-2xs"
    >
      <div class="flex items-center gap-2 font-medium">
        <span>💾</span>
        <span>Draf formulir Anda sebelumnya telah dipulihkan otomatis.</span>
      </div>
      <button
        type="button"
        @click="resetForm"
        class="font-bold underline text-amber-800 dark:text-amber-200 hover:text-amber-950"
      >
        Hapus Draf
      </button>
    </div>

    <!-- IT Testing Mode Banner -->
    <div v-if="isIT" class="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-300 flex items-center justify-between shadow-xs">
      <div class="flex items-center gap-2 font-medium">
        <Icon name="crown" className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
        <span><strong>Mode Pengujian IT:</strong> Pilihan rute <code>Test0</code>, <code>Test1</code> dan PIC <code>IT</code>, <code>ST</code> aktif khusus untuk akun Anda.</span>
      </div>
      <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200">IT Stealthed</span>
    </div>

    <!-- Route & Assignment Section Header -->
    <div class="border-b border-slate-200 dark:border-slate-800 pb-3 flex items-center justify-between">
      <div>
        <h3 class="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Icon name="location" className="w-4 h-4 text-google-blue-600 dark:text-google-blue-400" />
          <span>Informasi Rute &amp; Penugasan</span>
        </h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Pilih rute workshop dan nama penanggung jawab lapangan.</p>
      </div>

      <!-- Route Preview Badge -->
      <div v-if="form.lokasiBerangkat && form.lokasiTiba" class="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-google-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-800">
        <span>{{ form.lokasiBerangkat }}</span>
        <Icon name="chevron-right" className="w-3 h-3 text-google-blue-400" />
        <span>{{ form.lokasiTiba }}</span>
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <label>
        <span class="label">Lokasi Berangkat (Asal)</span>
        <select v-model="form.lokasiBerangkat" class="field" required>
          <option value="">-- Pilih Lokasi Asal --</option>
          <option v-for="item in availableWorkshops" :key="item" :value="item">
            {{ item.startsWith('Test') ? '🧪 ' + item + ' (Testing)' : item }}
          </option>
        </select>
      </label>
      <label>
        <span class="label">Lokasi Tiba (Tujuan)</span>
        <select v-model="form.lokasiTiba" class="field" required>
          <option value="">-- Pilih Lokasi Tujuan --</option>
          <option v-for="item in availableWorkshops" :key="item" :value="item">
            {{ item.startsWith('Test') ? '🧪 ' + item + ' (Testing)' : item }}
          </option>
        </select>
      </label>
      <label>
        <span class="label">PIC Penanggung Jawab</span>
        <select v-model="form.namaPIC" class="field" required>
          <option value="">-- Pilih Nama PIC --</option>
          <option v-for="item in availablePics" :key="item" :value="item">
            {{ (item === 'IT' || item === 'ST') ? '🧪 ' + item + ' (Testing)' : item }}
          </option>
        </select>
      </label>
      <label>
        <span class="label">Nama Proyek</span>
        <input v-model="form.namaProyek" class="field" required placeholder="Contoh: Proyek Line Feeding 1" />
      </label>
    </div>

    <div class="pt-2">
      <div class="mb-3 flex items-center justify-between">
        <div>
          <h3 class="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Icon name="box" className="w-4 h-4 text-google-blue-600 dark:text-google-blue-400" />
            <span>Daftar Material Bawaan</span>
            <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">({{ form.items.length }} Item)</span>
          </h3>
          <p class="text-xs text-slate-500 dark:text-slate-400">Spesifikasi barang, kuantitas, dan satuan.</p>
        </div>
        <button
          type="button"
          class="btn-secondary !py-1.5 !px-3.5 !text-xs !font-bold text-google-blue-700 dark:text-blue-300"
          @click="addItem"
        >
          <Icon name="plus" className="w-3.5 h-3.5 mr-1" />
          <span>Tambah Baris</span>
        </button>
      </div>

      <div class="space-y-2.5">
        <div
          v-for="(item, index) in form.items"
          :key="index"
          class="grid gap-2.5 sm:grid-cols-[auto_1fr_120px_130px_auto] items-center bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700/80 transition hover:border-slate-300 dark:hover:border-slate-600"
        >
          <span class="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center shrink-0">
            {{ index + 1 }}
          </span>
          <input v-model="item.nama" class="field mt-0" required placeholder="Deskripsi nama material..." />
          <input v-model.number="item.qty" class="field mt-0" min="1" type="number" required placeholder="Qty" />
          <select v-model="item.uom" class="field mt-0">
            <option v-for="uom in master.uoms" :key="uom" :value="uom">{{ uom }}</option>
          </select>
          <button
            type="button"
            class="btn-danger !p-2.5 !rounded-xl"
            :disabled="form.items.length === 1"
            @click="removeItem(index)"
            title="Hapus baris material"
          >
            <Icon name="trash" className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <div class="pt-4 border-t border-slate-200 dark:border-slate-800">
      <button class="btn-primary w-full !py-3.5 !text-sm !font-bold tracking-wide" :disabled="busy">
        <Icon v-if="busy" name="refresh" className="w-4 h-4 animate-spin mr-1.5" />
        <Icon v-else name="check" className="w-4 h-4 mr-1.5" />
        <span>{{ busy ? 'Menyimpan ke Server...' : 'Simpan & Terbitkan KPM' }}</span>
      </button>
    </div>
  </form>
</template>
