<script setup>
import { ref } from 'vue'

const props = defineProps({
  monitoring: { type: Array, required: true },
  master: { type: Object, required: true },
  busy: { type: Boolean, default: false },
  filter: { type: String, default: 'Semua' },
  canOverrideStatus: { type: Boolean, default: false }
})

const emit = defineEmits(['refresh', 'update:filter', 'change-status', 'archive', 'edit-material'])

function statusClass(status) {
  return {
    'Baru Dibuat': 'bg-google-surface-200 text-google-surface-800 border border-google-surface-300',
    'Belum Berangkat': 'bg-google-blue-50 text-google-blue-700 border border-google-blue-200',
    'Jalan': 'bg-google-yellow-50 text-google-yellow-800 border border-google-yellow-200',
    'Tiba': 'bg-google-green-50 text-google-green-700 border border-google-green-200',
    'Selesai': 'bg-google-blue-50 text-google-blue-800 border border-google-blue-200',
  }[status] || 'bg-google-surface-100 text-google-surface-700 border border-google-surface-200'
}
</script>

<template>
  <div class="space-y-4">
    <!-- Filter Chips (Google M3) -->
    <div class="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-google-surface-300/70 shadow-sm">
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="option in ['Semua', 'Baru Dibuat', 'Belum Berangkat', 'Jalan', 'Tiba', 'Selesai']"
          :key="option"
          class="chip transition-all duration-200 border"
          :class="filter === option ? 'bg-google-blue-600 text-white border-google-blue-600 shadow-sm' : 'bg-google-surface-100 text-google-surface-700 border-google-surface-300/60 hover:bg-google-surface-200'"
          @click="$emit('update:filter', option)"
        >
          {{ option }}
        </button>
      </div>
      <button class="btn-secondary !py-1.5 !px-3.5 !text-xs !font-bold" :disabled="busy" @click="$emit('refresh')">
        <span :class="{ 'animate-spin inline-block': busy }">↻</span>
        <span class="ml-1">Segarkan</span>
      </button>
    </div>

    <div v-if="!monitoring.length" class="panel text-center py-12 text-google-surface-400">
      <p class="text-3xl mb-2">📦</p>
      <p class="text-sm font-semibold text-google-surface-600">Tidak ada KPM pada kategori ini.</p>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <article v-for="item in monitoring" :key="item.nomor" class="panel hover:shadow-m3-2 transition-all">
        <div class="flex flex-wrap items-start justify-between gap-2 border-b border-google-surface-200/80 pb-3">
          <div>
            <span class="text-xs font-mono font-bold text-google-blue-700 tracking-wider uppercase">{{ item.nomor }}</span>
            <h3 class="text-base font-bold text-google-surface-900 mt-0.5">{{ item.proyek || 'Line Feeding' }}</h3>
            <p class="text-xs text-google-surface-500 font-medium">{{ item.lokasi }}</p>
          </div>

          <!-- Status Display: Dropdown for Super Admin/IT, Locked Badge for Admin -->
          <div class="flex items-center gap-1.5">
            <select
              v-if="canOverrideStatus"
              class="text-[11px] font-bold py-1 px-2.5 rounded-full border cursor-pointer outline-none transition shadow-sm"
              :class="statusClass(item.status)"
              :value="item.status"
              :disabled="busy"
              @change="$emit('change-status', item, $event)"
              title="Ubah Status KPM (Super Admin / IT Override)"
            >
              <option value="Baru Dibuat">Baru Dibuat</option>
              <option value="Belum Berangkat">Belum Berangkat</option>
              <option value="Jalan">Jalan</option>
              <option value="Tiba">Tiba</option>
              <option value="Selesai">Selesai</option>
            </select>
            <div
              v-else
              class="text-[11px] font-bold py-1 px-2.5 rounded-full border inline-flex items-center gap-1 shadow-sm cursor-not-allowed select-none opacity-90"
              :class="statusClass(item.status)"
              title="Status otomatis diperbarui oleh Driver di lapangan via aplikasi. Hanya Super Admin & IT yang dapat mengubah status secara manual."
            >
              <span class="text-[10px]">🔒</span>
              <span>{{ item.status }}</span>
            </div>
          </div>
        </div>

        <div class="mt-3.5 grid gap-2 text-xs sm:grid-cols-4 text-google-surface-600 bg-google-surface-50 p-3 rounded-xl border border-google-surface-200">
          <p><span class="font-bold text-google-surface-800">PIC:</span> {{ item.pic }}</p>
          <p><span class="font-bold text-google-surface-800">Dibuat:</span> {{ item.createdAtFormatted }}</p>
          <p><span class="font-bold text-google-surface-800">Durasi:</span> {{ item.duration || '-' }}</p>
          <p><span class="font-bold text-google-surface-800">Penerima:</span> <strong :class="item.penerima ? 'text-emerald-700' : 'text-slate-400 font-normal'">{{ item.penerima || '-' }}</strong></p>
        </div>

        <!-- Progress Bar -->
        <div class="mt-3.5">
          <div class="flex justify-between text-[11px] font-bold text-google-surface-500 mb-1">
            <span>Progress Perjalanan</span>
            <span>{{ item.fillPercent || 0 }}%</span>
          </div>
          <div class="h-2 overflow-hidden rounded-full bg-google-surface-200">
            <div
              class="h-full rounded-full bg-gradient-to-r from-google-blue-500 to-google-green-500 transition-all duration-500"
              :style="{ width: `${item.fillPercent || 0}%` }"
            ></div>
          </div>
        </div>

        <!-- GPS Track Quick Link -->
        <div v-if="item.gpsTrack" class="mt-3">
          <a
            :href="item.gpsTrack"
            target="_blank"
            rel="noopener noreferrer"
            class="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-google-blue-700 text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-200 transition shadow-sm"
          >
            <span>🗺️</span>
            <span>{{ item.isArrived ? 'Buka Rute Lengkap di Google Maps' : 'Lihat Live Titik Driver di GMaps' }}</span>
          </a>
        </div>

        <!-- Collapsible Material Details -->
        <details class="mt-3.5 rounded-xl bg-google-surface-50 p-3 border border-google-surface-200">
          <summary class="cursor-pointer text-xs font-bold text-google-blue-700 outline-none">
            📦 {{ item.daftarBarang?.length || 0 }} macam material bawaan
          </summary>
          <div class="mt-2 space-y-1 pt-2 border-t border-google-surface-200">
            <div v-for="material in item.daftarBarang" :key="`${material.nama}-${material.qty}`" class="flex justify-between text-xs text-google-surface-700 py-1 border-b border-google-surface-200/50 last:border-0">
              <span class="font-medium">{{ material.nama }}</span>
              <strong class="font-mono text-google-green-700 font-bold">{{ material.qty }} {{ material.uom }}</strong>
            </div>
          </div>
        </details>

        <!-- Material Management Badge & Button -->
        <div
          v-if="item.status === 'Baru Dibuat' || item.status === 'Belum Berangkat'"
          class="mt-3 p-3 rounded-2xl border text-xs flex flex-wrap items-center justify-between gap-2 shadow-sm transition-all bg-amber-50/90 border-amber-200 text-amber-950"
        >
          <div class="flex items-center gap-1.5 font-bold">
            <span class="text-base">✏️</span>
            <div>
              <p class="leading-tight">Kelola Item Material</p>
              <p class="text-[10px] font-normal text-amber-700">
                Bisa tambah / kurangi item material (Belum Berangkat)
              </p>
            </div>
          </div>
          <button
            type="button"
            class="btn-primary !py-1.5 !px-3 !text-xs !font-bold !bg-amber-600 hover:!bg-amber-700 shadow-sm"
            :disabled="busy"
            @click="$emit('edit-material', item)"
          >
            ✏️ Kelola Material
          </button>
        </div>

        <button v-if="item.isArrived" class="btn-danger w-full mt-4 !py-2.5 !text-xs !font-bold" :disabled="busy" @click="$emit('archive', item)">
          Arsipkan KPM Selesai
        </button>
      </article>
    </div>
  </div>
</template>
