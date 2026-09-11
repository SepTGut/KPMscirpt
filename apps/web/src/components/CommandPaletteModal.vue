<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import Icon from './Icon.vue'

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  monitoringList: { type: Array, default: () => [] },
  isAdmin: { type: Boolean, default: true },
  isIT: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'navigate', 'toggle-dark', 'select-kpm'])

const query = ref('')
const selectedIndex = ref(0)
const searchInput = ref(null)

const menuItems = [
  { id: 'create', title: 'Buat KPM Baru', subtitle: 'Formulir pengajuan KPM', icon: 'plus', category: 'Navigasi', action: () => emit('navigate', 'create') },
  { id: 'monitor', title: 'Pantau Status KPM', subtitle: 'Monitoring real-time distribusi', icon: 'doc', category: 'Navigasi', action: () => emit('navigate', 'monitor') },
  { id: 'map', title: 'Live Radar Armada', subtitle: 'Peta telemetri GPS armada', icon: 'map', category: 'Navigasi', action: () => emit('navigate', 'map') },
  { id: 'driver', title: 'Portal Driver', subtitle: 'Konfirmasi dan kirim status', icon: 'truck', category: 'Navigasi', action: () => emit('navigate', 'driver') },
  { id: 'users', title: 'Kelola Pengguna', subtitle: 'Hak akses dan akun sistem', icon: 'users', category: 'Sistem', action: () => emit('navigate', 'users') },
  { id: 'tutorial', title: 'Buku Panduan & Tutorial', subtitle: 'Dokumentasi penggunaan KPM', icon: 'tutorial', category: 'Sistem', action: () => emit('navigate', 'tutorial') },
  { id: 'theme', title: 'Ganti Mode Tema (Dark/Light)', subtitle: 'Alihkan mode tampilan visual', icon: 'sun', category: 'Aksi Cepat', action: () => emit('toggle-dark') }
]

const filteredItems = computed(() => {
  const q = query.value.trim().toLowerCase()
  const results = []

  // Navigation and action items
  menuItems.forEach(item => {
    if (!q || item.title.toLowerCase().includes(q) || item.subtitle.toLowerCase().includes(q)) {
      results.push(item)
    }
  })

  // KPM matching items from active monitoring
  if (props.monitoringList && props.monitoringList.length > 0) {
    const matchedKpms = props.monitoringList
      .filter(k => {
        const nomor = String(k.nomor || k.kpmId || '').toLowerCase()
        const pic = String(k.pic || '').toLowerCase()
        const driver = String(k.driver || '').toLowerCase()
        const proyek = String(k.proyek || '').toLowerCase()
        return q && (nomor.includes(q) || pic.includes(q) || driver.includes(q) || proyek.includes(q))
      })
      .slice(0, 5)
      .map(k => ({
        id: `kpm-${k.nomor || k.kpmId}`,
        title: `KPM ${k.nomor || k.kpmId}`,
        subtitle: `${k.proyek || 'Proyek'} • PIC: ${k.pic || '-'} • Status: ${k.status || '-'}`,
        icon: 'box',
        category: 'KPM Terdeteksi',
        action: () => {
          emit('navigate', 'monitor')
          emit('select-kpm', k.nomor || k.kpmId)
        }
      }))
    results.unshift(...matchedKpms)
  }

  return results
})

function executeSelected() {
  const item = filteredItems.value[selectedIndex.value]
  if (item && item.action) {
    item.action()
    closeModal()
  }
}

function selectItem(index) {
  selectedIndex.value = index
  executeSelected()
}

function closeModal() {
  query.value = ''
  selectedIndex.value = 0
  emit('close')
}

function onKeyDown(e) {
  if (!props.isOpen) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault()
      emit('navigate', 'command-palette-open')
    }
    return
  }

  if (e.key === 'Escape') {
    e.preventDefault()
    closeModal()
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (selectedIndex.value < filteredItems.value.length - 1) {
      selectedIndex.value++
    } else {
      selectedIndex.value = 0
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (selectedIndex.value > 0) {
      selectedIndex.value--
    } else {
      selectedIndex.value = Math.max(0, filteredItems.value.length - 1)
    }
  } else if (e.key === 'Enter') {
    e.preventDefault()
    executeSelected()
  }
}

watch(() => props.isOpen, (open) => {
  if (open) {
    selectedIndex.value = 0
    nextTick(() => {
      if (searchInput.value) searchInput.value.focus()
    })
  }
})

watch(query, () => {
  selectedIndex.value = 0
})

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm"
        @click.self="closeModal"
      >
        <div
          class="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[80vh] animate-fadeIn"
          role="dialog"
          aria-modal="true"
        >
          <!-- Search Header -->
          <div class="p-3.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center gap-3 bg-slate-50/50 dark:bg-slate-900/50">
            <Icon name="search" className="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0" />
            <input
              ref="searchInput"
              v-model="query"
              type="text"
              class="w-full bg-transparent text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
              placeholder="Cari nomor KPM, material, atau buka menu (Ketik untuk filter)..."
            />
            <kbd class="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
              ESC
            </kbd>
          </div>

          <!-- Search Results List -->
          <div class="flex-1 overflow-y-auto p-2 divide-y divide-slate-100/60 dark:divide-slate-800/60">
            <div v-if="filteredItems.length === 0" class="py-10 text-center text-xs text-slate-400">
              Tidak ada menu atau KPM yang cocok dengan "<span class="font-bold text-slate-600 dark:text-slate-300">{{ query }}</span>"
            </div>

            <div
              v-for="(item, idx) in filteredItems"
              :key="item.id"
              class="flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition text-xs select-none"
              :class="selectedIndex === idx ? 'bg-google-blue-50 dark:bg-blue-950/60 text-google-blue-900 dark:text-blue-100 border border-google-blue-200/60 dark:border-blue-800/60 shadow-xs' : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200 border border-transparent'"
              @mouseenter="selectedIndex = idx"
              @click="selectItem(idx)"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div
                  class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  :class="selectedIndex === idx ? 'bg-google-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'"
                >
                  <Icon :name="item.icon" className="w-4 h-4" />
                </div>
                <div class="min-w-0">
                  <div class="font-bold truncate">{{ item.title }}</div>
                  <div class="text-[11px] text-slate-400 dark:text-slate-500 truncate">{{ item.subtitle }}</div>
                </div>
              </div>

              <div class="shrink-0 flex items-center gap-2">
                <span class="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{{ item.category }}</span>
                <span v-if="selectedIndex === idx" class="text-google-blue-600 dark:text-blue-400 font-bold">↵</span>
              </div>
            </div>
          </div>

          <!-- Command Palette Footer Hints -->
          <div class="px-4 py-2 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span><kbd class="font-mono bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">↑</kbd> <kbd class="font-mono bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">↓</kbd> Navigasi</span>
              <span><kbd class="font-mono bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">↵</kbd> Pilih</span>
            </div>
            <span class="text-[10px]">KPM Command Spotlight</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
