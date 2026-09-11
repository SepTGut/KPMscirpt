<script setup>
import { ref, computed } from 'vue'
import Icon from './Icon.vue'

const props = defineProps({
  monitoring: { type: Array, required: true },
  master: { type: Object, required: true },
  busy: { type: Boolean, default: false },
  filter: { type: String, default: 'Semua' },
  canOverrideStatus: { type: Boolean, default: false },
  isIT: { type: Boolean, default: false },
  kpiStats: {
    type: Object,
    default: () => ({ totalActive: 0, inTransit: 0, pendingGate: 0, completed: 0 })
  },
  isPollingActive: { type: Boolean, default: true },
  pollingSecondsLeft: { type: Number, default: 25 }
})

const emit = defineEmits([
  'refresh',
  'update:filter',
  'change-status',
  'archive',
  'edit-material',
  'clean-test',
  'toggle-polling'
])

// Local View State
const viewMode = ref('grid') // 'grid' | 'table'
const searchQuery = ref('')
const sortColumn = ref('nomor')
const sortAsc = ref(false)

function confirmCleanTest() {
  if (confirm("PERINGATAN PEMBERSIHAN TESTING:\n\nApakah Anda yakin ingin menghapus seluruh rekaman pengujian (Test0, Test1, PIC IT/ST, Driver IT/ST) dan baris kosong di spreadsheet?\n\nTindakan ini akan menghapus semua jejak testing secara tuntas.")) {
    emit('clean-test')
  }
}

function statusClass(status) {
  return {
    'Baru Dibuat': 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
    'Belum Berangkat': 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
    'Menunggu Verifikasi Gerbang': 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    'Jalan': 'bg-amber-100 text-amber-900 border-amber-400 dark:bg-amber-900/50 dark:text-amber-200 dark:border-amber-700 font-extrabold',
    'Tiba': 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    'Selesai': 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-200 dark:border-emerald-700',
  }[status] || 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
}

// Search & Sort Filtered List
const displayedMonitoring = computed(() => {
  let list = props.monitoring || []
  const q = searchQuery.value.trim().toLowerCase()

  if (q) {
    list = list.filter(item => {
      const nomor = String(item.nomor || '').toLowerCase()
      const proyek = String(item.proyek || '').toLowerCase()
      const lokasi = String(item.lokasi || '').toLowerCase()
      const pic = String(item.pic || '').toLowerCase()
      const driver = String(item.driver || '').toLowerCase()
      const penerima = String(item.penerima || '').toLowerCase()
      return nomor.includes(q) || proyek.includes(q) || lokasi.includes(q) || pic.includes(q) || driver.includes(q) || penerima.includes(q)
    })
  }

  return [...list].sort((a, b) => {
    let valA = a[sortColumn.value] || ''
    let valB = b[sortColumn.value] || ''
    if (typeof valA === 'string') valA = valA.toLowerCase()
    if (typeof valB === 'string') valB = valB.toLowerCase()

    if (valA < valB) return sortAsc.value ? -1 : 1
    if (valA > valB) return sortAsc.value ? 1 : -1
    return 0
  })
})

function setSort(col) {
  if (sortColumn.value === col) {
    sortAsc.value = !sortAsc.value
  } else {
    sortColumn.value = col
    sortAsc.value = true
  }
}
</script>

<template>
  <div class="space-y-6 animate-slideUpFade">
    <!-- 1. Top Executive KPI Metric Summary Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <!-- KPI 1: Total Aktif -->
      <div class="panel p-4 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-md border border-slate-200/90 dark:border-slate-800">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total KPM Aktif</span>
          <div class="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-google-blue-600 dark:text-blue-400 flex items-center justify-center shadow-2xs">
            <Icon name="doc" className="w-4 h-4" />
          </div>
        </div>
        <p class="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">
          {{ kpiStats.totalActive }}
        </p>
        <div class="flex items-center gap-1.5 mt-1">
          <span class="w-1.5 h-1.5 rounded-full bg-google-blue-500"></span>
          <span class="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Dalam siklus operasional</span>
        </div>
      </div>

      <!-- KPI 2: Sedang Di Jalan -->
      <div class="panel p-4 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-md border border-slate-200/90 dark:border-slate-800">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Dalam Perjalanan</span>
          <div class="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center relative shadow-2xs">
            <span class="w-2 h-2 rounded-full bg-amber-500 absolute top-1 right-1 animate-ping"></span>
            <Icon name="truck" className="w-4 h-4" />
          </div>
        </div>
        <p class="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 mt-2 tracking-tight">
          {{ kpiStats.inTransit }}
        </p>
        <div class="flex items-center gap-1.5 mt-1">
          <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
          <span class="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Armada aktif di rute GPS</span>
        </div>
      </div>

      <!-- KPI 3: Menunggu Gerbang -->
      <div class="panel p-4 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-md border border-slate-200/90 dark:border-slate-800">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Menunggu Gerbang</span>
          <div class="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-2xs">
            <Icon name="shield" className="w-4 h-4" />
          </div>
        </div>
        <p class="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-2 tracking-tight">
          {{ kpiStats.pendingGate }}
        </p>
        <div class="flex items-center gap-1.5 mt-1">
          <span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
          <span class="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Staged / Perlu izin Checker</span>
        </div>
      </div>

      <!-- KPI 4: Selesai / Tiba -->
      <div class="panel p-4 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-md border border-slate-200/90 dark:border-slate-800">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tiba &amp; Selesai</span>
          <div class="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-2xs">
            <Icon name="check" className="w-4 h-4" />
          </div>
        </div>
        <p class="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2 tracking-tight">
          {{ kpiStats.completed }}
        </p>
        <div class="flex items-center gap-1.5 mt-1">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span class="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Serah terima material tuntas</span>
        </div>
      </div>
    </div>

    <!-- 2. Action Toolbar: Filters, Search, Dual-View Switcher & Auto-Polling -->
    <div class="panel p-3.5 sm:p-4 space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <!-- Search Input -->
        <div class="relative flex-1 min-w-[240px] max-w-md">
          <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            🔍
          </span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari KPM, Proyek, Lokasi, PIC, Driver..."
            class="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-google-blue-500 font-medium transition-all duration-200"
          />
          <button
            v-if="searchQuery"
            type="button"
            @click="searchQuery = ''"
            class="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            ✕
          </button>
        </div>

        <!-- Controls: Dual View Switcher + Smart Polling + Refresh -->
        <div class="flex items-center gap-2 flex-wrap">
          <!-- View Mode Toggle -->
          <div class="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
            <button
              type="button"
              @click="viewMode = 'grid'"
              class="px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1 active:scale-95"
              :class="viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
              title="Tampilan Kartu Ringkas"
            >
              <span>▦</span>
              <span class="hidden sm:inline">Kartu</span>
            </button>
            <button
              type="button"
              @click="viewMode = 'table'"
              class="px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1 active:scale-95"
              :class="viewMode === 'table' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
              title="Tampilan Tabel Padat (Spreadsheet)"
            >
              <span>≡</span>
              <span class="hidden sm:inline">Tabel</span>
            </button>
          </div>

          <!-- Smart Auto-Polling Badge with Pause/Play -->
          <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs shadow-2xs">
            <button
              type="button"
              @click="$emit('toggle-polling')"
              class="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-google-blue-600 dark:hover:text-google-blue-400 transition-colors active:scale-90"
              :title="isPollingActive ? 'Jeda Sinkronisasi Otomatis' : 'Lanjutkan Sinkronisasi Otomatis'"
            >
              <span>{{ isPollingActive ? '⏸️' : '▶️' }}</span>
            </button>
            <span class="font-mono text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
              {{ isPollingActive ? `${pollingSecondsLeft}s` : 'Paused' }}
            </span>
            <span v-if="isPollingActive" class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
          </div>

          <!-- Clean Test Data for IT -->
          <button
            v-if="isIT"
            type="button"
            class="rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 border border-rose-200 py-1.5 px-3 text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 shadow-2xs focus-visible:outline-none"
            :disabled="busy"
            @click="confirmCleanTest"
            title="Hapus semua baris testing dan baris kosong"
          >
            <Icon name="trash" className="w-3.5 h-3.5 text-rose-600" />
            <span class="hidden md:inline">Bersihkan Test</span>
          </button>

          <!-- Refresh Button -->
          <button
            class="btn-secondary !py-1.5 !px-3 !text-xs !font-bold"
            :disabled="busy"
            @click="$emit('refresh')"
            title="Segarkan Data Sekarang"
          >
            <Icon name="refresh" :className="busy ? 'w-3.5 h-3.5 animate-spin' : 'w-3.5 h-3.5'" />
            <span class="hidden sm:inline">Segarkan</span>
          </button>
        </div>
      </div>

      <!-- Filter Chips -->
      <div class="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
        <button
          v-for="option in ['Semua', 'Baru Dibuat', 'Belum Berangkat', 'Jalan', 'Tiba', 'Selesai']"
          :key="option"
          class="chip border transition-all duration-200 focus-visible:outline-none"
          :class="filter === option ? 'bg-google-blue-600 text-white border-google-blue-600 shadow-sm scale-102' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 hover:border-slate-300'"
          @click="$emit('update:filter', option)"
        >
          <span>{{ option }}</span>
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!displayedMonitoring.length" class="panel text-center py-16 text-slate-400 dark:text-slate-500">
      <div class="w-14 h-14 mx-auto mb-3 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700">
        <Icon name="box" className="w-7 h-7" />
      </div>
      <h4 class="text-sm font-bold text-slate-700 dark:text-slate-200">Tidak ada KPM yang cocok</h4>
      <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Silakan ubah filter atau kata kunci pencarian.</p>
    </div>

    <!-- 3A. View 1: Card Grid View -->
    <div v-if="viewMode === 'grid' && displayedMonitoring.length" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="item in displayedMonitoring"
        :key="item.nomor"
        class="panel transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-google-blue-300/80 dark:hover:border-blue-900/80 flex flex-col justify-between"
      >
        <div>
          <div class="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-xs font-mono font-bold text-google-blue-700 dark:text-blue-400 tracking-wider uppercase bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800 shadow-2xs">
                  {{ item.nomor }}
                </span>
                <span v-if="item.isTest" class="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 dark:border-purple-800 flex items-center gap-1 shadow-2xs">
                  <span>🧪</span>
                  <span>TEST</span>
                </span>
              </div>
              <h3 class="text-base font-black text-slate-900 dark:text-white mt-1.5 leading-snug">{{ item.proyek || 'Line Feeding' }}</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                <Icon name="location" className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span class="truncate">{{ item.lokasi }}</span>
              </p>
            </div>

            <!-- Status Display with animated pulse dot -->
            <div class="flex items-center gap-1.5">
              <select
                v-if="canOverrideStatus"
                class="text-[11px] font-bold py-1 px-2.5 rounded-full border cursor-pointer outline-none transition-all duration-200 shadow-2xs hover:shadow-xs active:scale-95"
                :class="statusClass(item.status)"
                :value="item.status"
                :disabled="busy"
                @change="$emit('change-status', item, $event)"
                title="Ubah Status KPM (Super Admin Override)"
              >
                <option value="Baru Dibuat">Baru Dibuat</option>
                <option value="Belum Berangkat">Belum Berangkat</option>
                <option value="Jalan">Jalan</option>
                <option value="Tiba">Tiba</option>
                <option value="Selesai">Selesai</option>
              </select>
              <div
                v-else
                class="text-[11px] font-bold py-1 px-2.5 rounded-full border inline-flex items-center gap-1.5 shadow-2xs select-none"
                :class="statusClass(item.status)"
              >
                <span v-if="item.status === 'Jalan'" class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                <span v-else-if="item.status === 'Selesai'" class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <Icon v-else name="lock" className="w-3 h-3" />
                <span>{{ item.status }}</span>
              </div>
            </div>
          </div>

          <div class="mt-3 grid gap-2 text-xs sm:grid-cols-2 text-slate-600 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <p><span class="font-bold text-slate-800 dark:text-slate-200">PIC:</span> {{ item.pic }}</p>
            <p><span class="font-bold text-slate-800 dark:text-slate-200">Driver:</span> {{ item.driver || '-' }}</p>
            <p><span class="font-bold text-slate-800 dark:text-slate-200">Durasi:</span> {{ item.duration || '-' }}</p>
            <p><span class="font-bold text-slate-800 dark:text-slate-200">Penerima:</span> <strong :class="item.penerima ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-slate-400 font-normal'">{{ item.penerima || '-' }}</strong></p>
          </div>

          <!-- Progress Bar with gradient -->
          <div class="mt-3">
            <div class="flex justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              <span>Progress Perjalanan</span>
              <span class="font-mono">{{ item.fillPercent || 0 }}%</span>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
              <div
                class="h-full rounded-full bg-gradient-to-r from-google-blue-500 via-indigo-500 to-emerald-500 transition-all duration-700"
                :style="{ width: `${item.fillPercent || 0}%` }"
              ></div>
            </div>
          </div>

          <!-- Photos Proof Badges -->
          <div v-if="item.buktiBerangkat || item.buktiTiba || item.buktiDiterima" class="mt-2.5 flex flex-wrap gap-1.5">
            <a
              v-if="item.buktiBerangkat"
              :href="item.buktiBerangkat"
              target="_blank"
              rel="noopener noreferrer"
              class="py-1 px-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-[11px] font-bold inline-flex items-center gap-1 border border-blue-200 dark:border-blue-800 transition-all active:scale-95 shadow-2xs"
            >
              <span>📷 Berangkat</span>
              <Icon name="external" className="w-2.5 h-2.5" />
            </a>
            <a
              v-if="item.buktiTiba"
              :href="item.buktiTiba"
              target="_blank"
              rel="noopener noreferrer"
              class="py-1 px-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-800 dark:text-amber-300 text-[11px] font-bold inline-flex items-center gap-1 border border-amber-200 dark:border-amber-800 transition-all active:scale-95 shadow-2xs"
            >
              <span>📷 Tiba</span>
              <Icon name="external" className="w-2.5 h-2.5" />
            </a>
            <a
              v-if="item.buktiDiterima"
              :href="item.buktiDiterima"
              target="_blank"
              rel="noopener noreferrer"
              class="py-1 px-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold inline-flex items-center gap-1 border border-emerald-300 dark:border-emerald-800 transition-all active:scale-95 shadow-2xs"
            >
              <span>📸 Diterima</span>
              <Icon name="external" className="w-2.5 h-2.5" />
            </a>
          </div>

          <!-- Collapsible Material Details -->
          <details class="mt-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 p-2.5 border border-slate-200/80 dark:border-slate-800 text-xs transition-all">
            <summary class="cursor-pointer font-bold text-google-blue-700 dark:text-blue-400 outline-none flex items-center gap-1.5 select-none hover:text-google-blue-800">
              <Icon name="box" className="w-3.5 h-3.5" />
              <span>{{ item.daftarBarang?.length || 0 }} macam material</span>
            </summary>
            <div class="mt-2 space-y-1 pt-2 border-t border-slate-200 dark:border-slate-700">
              <div v-for="material in item.daftarBarang" :key="`${material.nama}-${material.qty}`" class="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-800 last:border-0">
                <span class="font-medium text-slate-700 dark:text-slate-300">{{ material.nama }}</span>
                <strong class="font-mono text-emerald-600 dark:text-emerald-400">{{ material.qty }} {{ material.uom }}</strong>
              </div>
            </div>
          </details>
        </div>

        <div class="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
          <!-- Material Edit Button if Belum Berangkat -->
          <button
            v-if="item.status === 'Baru Dibuat' || item.status === 'Belum Berangkat'"
            type="button"
            class="w-full py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/50 border border-amber-300 dark:border-amber-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-98 shadow-2xs"
            :disabled="busy"
            @click="$emit('edit-material', item)"
          >
            <Icon name="doc" className="w-3.5 h-3.5" />
            <span>Kelola Item Material</span>
          </button>

          <!-- Archive Button if Arrived -->
          <button
            v-if="item.isArrived"
            type="button"
            class="btn-danger w-full !py-2 !text-xs !font-bold"
            :disabled="busy"
            @click="$emit('archive', item)"
          >
            Arsipkan KPM Selesai
          </button>
        </div>
      </article>
    </div>

    <!-- 3B. View 2: Dense Table View (Spreadsheet Mode) -->
    <div v-else-if="viewMode === 'table' && displayedMonitoring.length" class="panel !p-0 overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
      <div class="overflow-x-auto max-h-[70vh]">
        <table class="w-full text-left text-xs border-collapse">
          <thead class="sticky top-0 z-10 bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-md text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 text-[11px] font-black uppercase tracking-wider select-none">
            <tr>
              <th @click="setSort('nomor')" class="py-3 px-3 cursor-pointer hover:bg-slate-200/80 dark:hover:bg-slate-700 transition">
                No KPM <span v-if="sortColumn === 'nomor'">{{ sortAsc ? '▲' : '▼' }}</span>
              </th>
              <th @click="setSort('proyek')" class="py-3 px-3 cursor-pointer hover:bg-slate-200/80 dark:hover:bg-slate-700 transition">
                Proyek <span v-if="sortColumn === 'proyek'">{{ sortAsc ? '▲' : '▼' }}</span>
              </th>
              <th class="py-3 px-3">Rute (Asal ➔ Tujuan)</th>
              <th class="py-3 px-3">PIC</th>
              <th class="py-3 px-3">Driver</th>
              <th class="py-3 px-3">Durasi</th>
              <th class="py-3 px-3">Penerima</th>
              <th @click="setSort('status')" class="py-3 px-3 cursor-pointer hover:bg-slate-200/80 dark:hover:bg-slate-700 transition">
                Status <span v-if="sortColumn === 'status'">{{ sortAsc ? '▲' : '▼' }}</span>
              </th>
              <th class="py-3 px-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
            <tr
              v-for="item in displayedMonitoring"
              :key="item.nomor"
              class="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors duration-150"
            >
              <td class="py-2.5 px-3 font-mono font-bold text-google-blue-700 dark:text-blue-400 whitespace-nowrap">
                {{ item.nomor }}
              </td>
              <td class="py-2.5 px-3 font-bold text-slate-900 dark:text-white max-w-[180px] truncate">
                {{ item.proyek || 'Line Feeding' }}
              </td>
              <td class="py-2.5 px-3 text-slate-600 dark:text-slate-300 max-w-[200px] truncate">
                {{ item.lokasi }}
              </td>
              <td class="py-2.5 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                {{ item.pic }}
              </td>
              <td class="py-2.5 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                {{ item.driver || '-' }}
              </td>
              <td class="py-2.5 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono">
                {{ item.duration || '-' }}
              </td>
              <td class="py-2.5 px-3 whitespace-nowrap">
                <span :class="item.penerima ? 'text-emerald-700 dark:text-emerald-400 font-extrabold' : 'text-slate-400'">
                  {{ item.penerima || '-' }}
                </span>
              </td>
              <td class="py-2.5 px-3 whitespace-nowrap">
                <select
                  v-if="canOverrideStatus"
                  class="text-[10px] font-bold py-0.5 px-2 rounded-full border cursor-pointer outline-none transition shadow-2xs active:scale-95"
                  :class="statusClass(item.status)"
                  :value="item.status"
                  :disabled="busy"
                  @change="$emit('change-status', item, $event)"
                >
                  <option value="Baru Dibuat">Baru Dibuat</option>
                  <option value="Belum Berangkat">Belum Berangkat</option>
                  <option value="Jalan">Jalan</option>
                  <option value="Tiba">Tiba</option>
                  <option value="Selesai">Selesai</option>
                </select>
                <span
                  v-else
                  class="text-[10px] font-bold py-0.5 px-2 rounded-full border inline-block shadow-2xs"
                  :class="statusClass(item.status)"
                >
                  {{ item.status }}
                </span>
              </td>
              <td class="py-2.5 px-3 text-right whitespace-nowrap">
                <div class="flex items-center justify-end gap-1.5">
                  <button
                    v-if="item.status === 'Baru Dibuat' || item.status === 'Belum Berangkat'"
                    type="button"
                    class="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition active:scale-90"
                    @click="$emit('edit-material', item)"
                    title="Kelola Material"
                  >
                    <Icon name="doc" className="w-3.5 h-3.5" />
                  </button>
                  <button
                    v-if="item.isArrived"
                    type="button"
                    class="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition active:scale-90"
                    @click="$emit('archive', item)"
                    title="Arsipkan KPM"
                  >
                    <Icon name="close" className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
