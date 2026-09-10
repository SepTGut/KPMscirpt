<script setup>
import { ref } from 'vue'
import Icon from './Icon.vue'
import { useTheme } from '../composables/useTheme'

const props = defineProps({
  mode: { type: String, required: true },
  adminView: { type: String, required: true },
  isIT: { type: Boolean, default: false },
  canSwitchRole: { type: Boolean, default: false },
  activeKpmCount: { type: Number, default: 0 },
  activeDeliveryCount: { type: Number, default: 0 }
})

const emit = defineEmits(['navigate', 'toggle-mode', 'logout'])

const showMobileDrawer = ref(false)
const { isDark, toggleDark } = useTheme()

function handleNav(view) {
  emit('navigate', view)
  showMobileDrawer.value = false
}
</script>

<template>
  <div>
    <!-- Backdrop for Drawer -->
    <div
      v-if="showMobileDrawer"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden animate-fadeIn"
      @click="showMobileDrawer = false"
    ></div>

    <!-- Mobile Drawer Sheet -->
    <div
      v-if="showMobileDrawer"
      class="fixed inset-x-0 bottom-16 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-3xl z-40 p-4 shadow-2xl lg:hidden max-h-[75vh] overflow-y-auto space-y-3 animate-fadeIn"
    >
      <div class="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-2"></div>
      <h3 class="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2">
        Menu Navigasi Tambahan
      </h3>

      <div class="grid grid-cols-2 gap-2 text-xs">
        <template v-if="mode === 'admin'">
          <button
            @click="handleNav('recipient')"
            class="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 font-bold transition text-left"
            :class="adminView === 'recipient' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300' : 'text-slate-700 dark:text-slate-200'"
          >
            <Icon name="box" className="w-4 h-4 text-emerald-600 shrink-0" />
            <span class="truncate">Penerima Workshop</span>
          </button>

          <button
            @click="handleNav('users')"
            class="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 font-bold transition text-left"
            :class="adminView === 'users' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300' : 'text-slate-700 dark:text-slate-200'"
          >
            <Icon name="users" className="w-4 h-4 text-google-blue-600 shrink-0" />
            <span class="truncate">Kelola Pengguna</span>
          </button>

          <button
            @click="handleNav('tutorial')"
            class="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 font-bold transition text-left"
            :class="adminView === 'tutorial' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300' : 'text-slate-700 dark:text-slate-200'"
          >
            <Icon name="tutorial" className="w-4 h-4 text-indigo-600 shrink-0" />
            <span class="truncate">Buku Panduan</span>
          </button>
        </template>

        <button
          @click="toggleDark"
          class="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 font-bold transition text-slate-700 dark:text-slate-200 text-left"
        >
          <span class="text-base">{{ isDark ? '☀️' : '🌙' }}</span>
          <span class="truncate">{{ isDark ? 'Mode Terang' : 'Mode Gelap' }}</span>
        </button>

        <button
          v-if="canSwitchRole"
          @click="$emit('toggle-mode'); showMobileDrawer = false"
          class="col-span-2 flex items-center justify-center gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300 font-bold transition"
        >
          <Icon name="switch" className="w-4 h-4" />
          <span>{{ mode === 'admin' ? 'Beralih ke Portal Driver' : 'Beralih ke Portal Admin' }}</span>
        </button>

        <button
          @click="$emit('logout'); showMobileDrawer = false"
          class="col-span-2 flex items-center justify-center gap-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold transition"
        >
          <Icon name="close" className="w-4 h-4" />
          <span>Keluar Akun (Logout)</span>
        </button>
      </div>
    </div>

    <!-- Fixed Bottom Bar -->
    <nav class="fixed inset-x-0 bottom-0 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-40 lg:hidden flex items-center justify-around px-2 shadow-lg">
      <template v-if="mode === 'admin'">
        <button
          type="button"
          @click="handleNav('create')"
          class="flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-bold transition-all focus-visible:outline-none"
          :class="adminView === 'create' ? 'text-google-blue-600 dark:text-google-blue-400 font-extrabold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'"
        >
          <Icon name="plus" className="w-5 h-5 mb-0.5" />
          <span>Buat</span>
        </button>

        <button
          type="button"
          @click="handleNav('monitor')"
          class="relative flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-bold transition-all focus-visible:outline-none"
          :class="adminView === 'monitor' ? 'text-google-blue-600 dark:text-google-blue-400 font-extrabold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'"
        >
          <Icon name="doc" className="w-5 h-5 mb-0.5" />
          <span>Monitor</span>
          <span
            v-if="activeKpmCount > 0"
            class="absolute top-0.5 right-1/4 w-4 h-4 rounded-full bg-google-blue-600 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white dark:ring-slate-900"
          >
            {{ activeKpmCount }}
          </span>
        </button>

        <button
          type="button"
          @click="handleNav('map')"
          class="flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-bold transition-all focus-visible:outline-none"
          :class="adminView === 'map' ? 'text-google-blue-600 dark:text-google-blue-400 font-extrabold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'"
        >
          <Icon name="map" className="w-5 h-5 mb-0.5" />
          <span>Radar</span>
        </button>

        <button
          type="button"
          @click="handleNav('checker')"
          class="flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-bold transition-all focus-visible:outline-none"
          :class="adminView === 'checker' ? 'text-amber-600 dark:text-amber-400 font-extrabold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'"
        >
          <Icon name="shield" className="w-5 h-5 mb-0.5" />
          <span>Gerbang</span>
        </button>

        <button
          type="button"
          @click="showMobileDrawer = !showMobileDrawer"
          class="flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-bold transition-all text-slate-500 dark:text-slate-400 hover:text-slate-800 focus-visible:outline-none"
        >
          <span class="text-lg leading-none mb-0.5">⋮</span>
          <span>Lainnya</span>
        </button>
      </template>

      <!-- Driver Mobile Bottom Nav -->
      <template v-else>
        <button
          type="button"
          @click="handleNav('driver')"
          class="relative flex flex-col items-center justify-center flex-1 py-1 text-[10px] transition-all duration-150"
          :class="adminView !== 'tutorial' ? 'text-google-blue-600 dark:text-google-blue-400 font-extrabold' : 'text-slate-500 dark:text-slate-400 font-medium'"
        >
          <Icon name="truck" className="w-5 h-5 mb-0.5" />
          <span>Tugas Kirim</span>
          <span
            v-if="activeDeliveryCount > 0"
            class="absolute top-0.5 right-1/4 w-4 h-4 rounded-full bg-google-blue-600 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white dark:ring-slate-900"
          >
            {{ activeDeliveryCount }}
          </span>
        </button>

        <button
          type="button"
          @click="handleNav('tutorial')"
          class="flex flex-col items-center justify-center flex-1 py-1 text-[10px] transition-all duration-150"
          :class="adminView === 'tutorial' ? 'text-google-blue-600 dark:text-google-blue-400 font-extrabold' : 'text-slate-500 dark:text-slate-400 font-medium'"
        >
          <Icon name="tutorial" className="w-5 h-5 mb-0.5" />
          <span>Panduan</span>
        </button>

        <button
          type="button"
          @click="showMobileDrawer = !showMobileDrawer"
          class="flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-bold text-slate-500 dark:text-slate-400"
        >
          <span class="text-lg leading-none mb-0.5">⋮</span>
          <span>Menu</span>
        </button>
      </template>
    </nav>
  </div>
</template>
