<script setup>
import { ref, computed } from 'vue'

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
    <div class="border-b border-google-surface-200 pb-3">
      <h3 class="text-base font-bold text-google-surface-800">Informasi Rute & Penugasan</h3>
      <p class="text-xs text-google-surface-500">Pilih rute workshop dan nama penanggung jawab.</p>
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
          <h3 class="text-sm font-bold text-google-surface-800">Daftar Material Bawaan</h3>
          <p class="text-xs text-google-surface-500">Spesifikasi barang, kuantitas, dan satuan.</p>
        </div>
        <button type="button" class="btn-secondary !py-1.5 !px-3.5 !text-xs !font-bold text-google-blue-700" @click="addItem">
          + Tambah Baris
        </button>
      </div>

      <div class="space-y-2.5">
        <div v-for="(item, index) in form.items" :key="index" class="grid gap-2.5 sm:grid-cols-[1fr_120px_130px_auto] items-center bg-google-surface-50 p-3 rounded-2xl border border-google-surface-200">
          <input v-model="item.nama" class="field mt-0 bg-white" required placeholder="Deskripsi nama material..." />
          <input v-model.number="item.qty" class="field mt-0 bg-white" min="1" type="number" required placeholder="Qty" />
          <select v-model="item.uom" class="field mt-0 bg-white">
            <option v-for="uom in master.uoms" :key="uom" :value="uom">{{ uom }}</option>
          </select>
          <button type="button" class="btn-danger !py-2.5 !px-3.5 !rounded-xl" :disabled="form.items.length === 1" @click="removeItem(index)">
            ✕
          </button>
        </div>
      </div>
    </div>

    <div class="pt-4 border-t border-google-surface-200">
      <button class="btn-primary w-full !py-3.5 !text-sm !font-bold tracking-wide" :disabled="busy">
        {{ busy ? 'Menyimpan ke Server...' : 'Simpan & Terbitkan KPM ✓' }}
      </button>
    </div>
  </form>
</template>
