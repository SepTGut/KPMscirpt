<script setup>
import { ref, computed } from 'vue'
import Icon from './Icon.vue'

const props = defineProps({
  currentUser: { type: Object, default: null },
  mode: { type: String, default: 'admin' },
  adminView: { type: String, default: 'create' },
  isIT: { type: Boolean, default: false },
  isSuperAdmin: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },
  isDriver: { type: Boolean, default: false },
  canSwitchRole: { type: Boolean, default: false },
  roleBadgeClass: { type: String, default: '' },
  isDark: { type: Boolean, default: false },
  isOnline: { type: Boolean, default: true }
})

const emit = defineEmits(['toggle-mode', 'toggle-dark', 'navigate', 'logout'])

const showOmniMenu = ref(false)

function onKeyDown(e) {
  if (e.key === 'Escape' && showOmniMenu.value) {
    showOmniMenu.value = false
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', onKeyDown)
}
</script>

<template>
  <header class="border-b border-google-surface-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl sticky top-0 z-20 shadow-2xs transition-colors duration-200">
    <div class="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
      <!-- Mobile Brand Logo / Desktop Section Title -->
      <div class="flex items-center gap-3">
        <!-- Mobile Brand Logo -->
        <div class="lg:hidden flex items-center gap-2">
          <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-google-blue-600 via-indigo-500 to-google-green-500 flex items-center justify-center font-bold text-white text-xs shadow-md shadow-google-blue-500/20 transition-transform active:scale-95">
            LF
          </div>
          <span class="text-base font-black text-slate-900 dark:text-white leading-tight">KPM Line Feeding</span>
        </div>

        <!-- Desktop Section Context -->
        <div class="hidden lg:flex items-center gap-2.5">
          <span class="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">KPM Workspace</span>
          <span class="text-slate-300 dark:text-slate-700">/</span>
          <span class="text-sm font-black text-slate-800 dark:text-slate-200">
            {{ mode === 'admin' ? 'Administrator Hub' : 'Portal Driver' }}
          </span>
          <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5 shadow-2xs ml-1">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            v1P • PROD
          </span>
        </div>
      </div>

      <!-- Right Action Controls -->
      <div class="flex items-center gap-2">
        <!-- Network Offline Indicator -->
        <div v-if="!isOnline" class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-bold animate-pulse shadow-xs">
          <span class="w-2 h-2 rounded-full bg-amber-500"></span>
          <span>Mode Offline</span>
        </div>

        <!-- Dark / Light Mode Toggle Button -->
        <button
          type="button"
          class="w-9 h-9 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center transition-all duration-200 active:scale-90 shadow-2xs hover:shadow-xs focus-visible:outline-none"
          @click="$emit('toggle-dark')"
          :title="isDark ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'"
        >
          <span class="text-sm leading-none transition-transform duration-200 hover:rotate-12">{{ isDark ? '☀️' : '🌙' }}</span>
        </button>

        <!-- Role Switcher for Super Admin (Mobile only; Desktop is inside AppSidebar) -->
        <button
          v-if="canSwitchRole"
          type="button"
          class="lg:hidden rounded-full px-3 py-1.5 text-xs font-bold transition-all duration-200 active:scale-95 shadow-2xs border flex items-center gap-1.5 focus-visible:outline-none"
          :class="mode === 'admin' ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800' : 'bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800'"
          @click="$emit('toggle-mode')"
          :title="mode === 'admin' ? 'Beralih ke Tampilan Driver' : 'Beralih ke Tampilan Admin'"
        >
          <Icon name="switch" className="w-3.5 h-3.5" />
          <span class="hidden sm:inline">{{ mode === 'admin' ? 'Mode Driver' : 'Mode Admin' }}</span>
        </button>

        <!-- IT Omni Switcher -->
        <div v-if="isIT" class="relative">
          <button
            type="button"
            class="rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white px-3.5 py-1.5 text-xs font-extrabold shadow-sm hover:shadow-md flex items-center gap-1.5 transition-all duration-200 active:scale-95 focus-visible:outline-none"
            @click="showOmniMenu = !showOmniMenu"
            title="Akses Semua Situs & Halaman KPM (Super Admin IT)"
            aria-haspopup="true"
            :aria-expanded="showOmniMenu"
          >
            <span>⚡</span>
            <span class="hidden sm:inline">Akses Situs IT</span>
            <span class="text-[9px] transition-transform duration-200" :class="showOmniMenu ? 'rotate-180' : ''">▼</span>
          </button>

          <!-- Backdrop -->
          <div v-if="showOmniMenu" class="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]" @click="showOmniMenu = false"></div>

          <!-- Dropdown Menu -->
          <Transition
            enter-active-class="transition duration-150 ease-out"
            enter-from-class="opacity-0 scale-95 -translate-y-1"
            enter-to-class="opacity-100 scale-100 translate-y-0"
            leave-active-class="transition duration-100 ease-in"
            leave-from-class="opacity-100 scale-100 translate-y-0"
            leave-to-class="opacity-0 scale-95 -translate-y-1"
          >
            <div
              v-if="showOmniMenu"
              class="absolute right-0 mt-2 w-72 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700/80 py-2 z-50 text-xs divide-y divide-slate-100 dark:divide-slate-800 animate-fadeIn"
            >
              <div class="px-3.5 py-2 text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-400 bg-amber-50/70 dark:bg-amber-950/40 rounded-t-xl flex items-center justify-between">
                <span class="flex items-center gap-1.5">
                  <span>⚡</span><span>Omni-Access Hub</span>
                </span>
                <span class="text-emerald-600 dark:text-emerald-400 font-mono font-bold text-[9px] px-1.5 py-0.5 rounded bg-emerald-100/60 dark:bg-emerald-950/80">SUPER ADMIN</span>
              </div>

              <!-- Operasional Utama -->
              <div class="py-1.5 px-1">
                <div class="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">Operasional Utama</div>
                <button @click="$emit('navigate', 'create'); showOmniMenu = false" class="w-full text-left px-2.5 py-2 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800/80 flex items-center gap-2.5 font-semibold transition text-slate-700 dark:text-slate-200">
                  <Icon name="plus" className="w-4 h-4 text-google-blue-600" /><span>Buat KPM Baru</span>
                </button>
                <button @click="$emit('navigate', 'monitor'); showOmniMenu = false" class="w-full text-left px-2.5 py-2 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800/80 flex items-center gap-2.5 font-semibold transition text-slate-700 dark:text-slate-200">
                  <Icon name="doc" className="w-4 h-4 text-google-blue-600" /><span>Pantau KPM</span>
                </button>
                <button @click="$emit('navigate', 'map'); showOmniMenu = false" class="w-full text-left px-2.5 py-2 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800/80 flex items-center gap-2.5 font-semibold transition text-slate-700 dark:text-slate-200">
                  <Icon name="map" className="w-4 h-4 text-indigo-600" /><span>Live Radar Armada</span>
                </button>
              </div>

              <!-- Pos Gerbang & Lapangan -->
              <div class="py-1.5 px-1">
                <div class="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">Pos Gerbang & Lapangan</div>
                <button @click="$emit('navigate', 'checker'); showOmniMenu = false" class="w-full text-left px-2.5 py-2 rounded-xl hover:bg-amber-50/80 dark:hover:bg-amber-950/50 flex items-center gap-2.5 font-semibold transition text-slate-700 dark:text-slate-200">
                  <Icon name="shield" className="w-4 h-4 text-amber-600" /><span>Pos Checker (Gate Out)</span>
                </button>
                <button @click="$emit('navigate', 'recipient'); showOmniMenu = false" class="w-full text-left px-2.5 py-2 rounded-xl hover:bg-emerald-50/80 dark:hover:bg-emerald-950/50 flex items-center gap-2.5 font-semibold transition text-slate-700 dark:text-slate-200">
                  <Icon name="box" className="w-4 h-4 text-emerald-600" /><span>Penerima (Tanda Terima)</span>
                </button>
                <button @click="$emit('navigate', 'driver'); showOmniMenu = false" class="w-full text-left px-2.5 py-2 rounded-xl hover:bg-blue-50/80 dark:hover:bg-blue-950/50 flex items-center gap-2.5 font-semibold transition text-slate-700 dark:text-slate-200">
                  <Icon name="truck" className="w-4 h-4 text-blue-600" /><span>Portal Lapangan Driver</span>
                </button>
              </div>

              <!-- Sistem & Dokumentasi -->
              <div class="py-1.5 px-1">
                <div class="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">Sistem & Dokumentasi</div>
                <button @click="$emit('navigate', 'users'); showOmniMenu = false" class="w-full text-left px-2.5 py-2 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800/80 flex items-center gap-2.5 font-semibold transition text-slate-700 dark:text-slate-200">
                  <Icon name="users" className="w-4 h-4 text-slate-600 dark:text-slate-400" /><span>Kelola Pengguna</span>
                </button>
                <button @click="$emit('navigate', 'tutorial'); showOmniMenu = false" class="w-full text-left px-2.5 py-2 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800/80 flex items-center gap-2.5 font-semibold transition text-slate-700 dark:text-slate-200">
                  <Icon name="tutorial" className="w-4 h-4 text-slate-600 dark:text-slate-400" /><span>Buku Panduan & Tutorial</span>
                </button>
              </div>
            </div>
          </Transition>
        </div>

        <!-- Active User Chip (Desktop) -->
        <div class="hidden sm:flex items-center gap-2 rounded-full bg-google-surface-100 dark:bg-slate-800 py-1 pl-3 pr-2 border border-google-surface-300/70 dark:border-slate-700 text-xs shadow-inner">
          <span class="font-bold text-google-surface-800 dark:text-slate-200 flex items-center gap-1.5">
            <Icon :name="(isSuperAdmin || isIT) ? 'crown' : (isAdmin ? 'shield' : 'truck')" className="w-3.5 h-3.5 text-google-surface-700 dark:text-slate-400" />
            <span class="text-google-blue-700 dark:text-google-blue-400 font-semibold">{{ currentUser.name || currentUser.username }}</span>
            <span
              class="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border shadow-2xs"
              :class="roleBadgeClass"
            >
              {{ isIT ? 'Super Admin' : (currentUser.roleLabel || currentUser.role) }}
            </span>
          </span>
        </div>

        <!-- Logout Button (Mobile Header) -->
        <button
          type="button"
          class="lg:hidden rounded-full bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-300 hover:text-rose-600 px-2.5 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 transition shadow-2xs flex items-center gap-1 focus-visible:outline-none"
          @click="$emit('logout')"
          title="Keluar / Ganti Akun"
        >
          <Icon name="logout" className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  </header>
</template>
