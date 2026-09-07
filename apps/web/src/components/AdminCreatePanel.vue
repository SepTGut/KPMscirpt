<script setup>
import { ref } from 'vue'
import Icon from './Icon.vue'

const props = defineProps({
  master: { type: Object, required: true },
  busy: { type: Boolean, default: false }
})

const emit = defineEmits(['create'])

const form = ref({
  lokasiBerangkat: '', lokasiTiba: '', namaPIC: '', namaProyek: '',
  items: [{ nama: '', qty: 1, uom: 'PCS' }],
})

function addItem() {
  form.value.items.push({ nama: '', qty: 1, uom: props.master.uoms?.[0] || 'PCS' })
}

function removeItem(index) {
  if (form.value.items.length > 1) form.value.items.splice(index, 1)
}

function submit() {
  if (!form.value.lokasiBerangkat || !form.value.lokasiTiba || !form.value.namaPIC) return
  if (!form.value.items.every(item => item.nama?.trim() && Number(item.qty) > 0)) return
  emit('create', { ...form.value })
  form.value = {
    lokasiBerangkat: '', lokasiTiba: '', namaPIC: '', namaProyek: '',
    items: [{ nama: '', qty: 1, uom: props.master.uoms?.[0] || 'PCS' }],
  }
}
</script>

<template>
  <form class="panel space-y-6" @submit.prevent="submit">
    <div class="border-b border-google-surface-200/90 pb-3 flex items-center justify-between">
      <div>
        <h3 class="text-base font-bold text-google-surface-800 flex items-center gap-2">
          <Icon name="location" className="w-4 h-4 text-google-blue-600" />
          <span>Informasi Rute & Penugasan</span>
        </h3>
        <p class="text-xs text-google-surface-500 mt-0.5">Pilih rute workshop dan nama penanggung jawab lapangan.</p>
      </div>

      <!-- Route Preview Badge if both selected -->
      <div v-if="form.lokasiBerangkat && form.lokasiTiba" class="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-google-blue-50 text-google-blue-700 text-xs font-bold border border-google-blue-200">
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
          <option v-for="item in master.workshops" :key="item" :value="item">{{ item }}</option>
        </select>
      </label>
      <label>
        <span class="label">Lokasi Tiba (Tujuan)</span>
        <select v-model="form.lokasiTiba" class="field" required>
          <option value="">-- Pilih Lokasi Tujuan --</option>
          <option v-for="item in master.workshops" :key="item" :value="item">{{ item }}</option>
        </select>
      </label>
      <label>
        <span class="label">PIC Penanggung Jawab</span>
        <select v-model="form.namaPIC" class="field" required>
          <option value="">-- Pilih Nama PIC --</option>
          <option v-for="item in master.pics" :key="item" :value="item">{{ item }}</option>
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
          <h3 class="text-sm font-bold text-google-surface-800 flex items-center gap-2">
            <Icon name="box" className="w-4 h-4 text-google-blue-600" />
            <span>Daftar Material Bawaan</span>
            <span class="text-xs font-semibold text-google-surface-500">({{ form.items.length }} Item)</span>
          </h3>
          <p class="text-xs text-google-surface-500">Spesifikasi barang, kuantitas, dan satuan.</p>
        </div>
        <button type="button" class="btn-secondary !py-1.5 !px-3.5 !text-xs !font-bold text-google-blue-700 hover:bg-google-blue-50" @click="addItem">
          <Icon name="plus" className="w-3.5 h-3.5 mr-1" />
          <span>Tambah Baris</span>
        </button>
      </div>

      <div class="space-y-2.5">
        <div v-for="(item, index) in form.items" :key="index" class="grid gap-2.5 sm:grid-cols-[auto_1fr_120px_130px_auto] items-center bg-google-surface-50 p-3 rounded-2xl border border-google-surface-200/90 transition-all hover:border-google-surface-300">
          <span class="w-6 h-6 rounded-full bg-google-surface-200 text-google-surface-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
            {{ index + 1 }}
          </span>
          <input v-model="item.nama" class="field mt-0 bg-white" required placeholder="Deskripsi nama material..." />
          <input v-model.number="item.qty" class="field mt-0 bg-white" min="1" type="number" required placeholder="Qty" />
          <select v-model="item.uom" class="field mt-0 bg-white">
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

    <div class="pt-4 border-t border-google-surface-200/90">
      <button class="btn-primary w-full !py-3.5 !text-sm !font-bold tracking-wide" :disabled="busy">
        <Icon v-if="busy" name="refresh" className="w-4 h-4 animate-spin mr-1.5" />
        <Icon v-else name="check" className="w-4 h-4 mr-1.5" />
        <span>{{ busy ? 'Menyimpan ke Server...' : 'Simpan & Terbitkan KPM' }}</span>
      </button>
    </div>
  </form>
</template>
