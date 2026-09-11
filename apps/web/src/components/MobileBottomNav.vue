<script setup>
import { ref } from 'vue'
import Icon from './Icon.vue'

const props = defineProps({
  mode: { type: String, required: true },
  adminView: { type: String, required: true },
  isIT: { type: Boolean, default: false },
  canSwitchRole: { type: Boolean, default: false },
  activeKpmCount: { type: Number, default: 0 },
  activeDeliveryCount: { type: Number, default: 0 }
})

const emit = defineEmits(['navigate', 'toggle-mode', 'logout', 'toggle-dark', 'open-command-palette'])

const showMobileDrawer = ref(false)

function handleNav(view) {
  emit('navigate', view)
  showMobileDrawer.value = false
}
</script>

<template>
  <div>
    <!-- Backdrop for Drawer -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showMobileDrawer"
        class="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden"
        @click="showMobileDrawer = false"
      ></div>
    </Transition>

    <!-- Mobile Drawer Sheet (Bottom Sheet) -->
    <Transition
      enter-active-class="transition duration-250 ease-out"
      enter-from-class="translate-y-full opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-full opacity-0"
    >
      <div
        v-if="showMobileDrawer"
        class="fixed inset-x-3 bottom-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 rounded-3xl z-40 p-4 shadow-2xl lg:hidden max-h-[80vh] overflow-y-auto space-y-3 animate-fadeIn"
      >
        <div class="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-2"></div>
        <div class="flex items-center justify-between px-2">
          <h3 class="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Akses Cepat &amp; Menu Lainnya
          </h3>
          <button
            type="button"
            class="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
            @click="showMobileDrawer = false"
          >
            ✕
          </button>
        </div>

        <div class="grid grid-cols-2 gap-2 text-xs">
          <!-- Command Search Button in Mobile Sheet -->
          <button
            @click="$emit('open-command-palette'); showMobileDrawer = false"
            class="col-span-2 flex items-center gap-2.5 p-3 rounded-2xl bg-google-blue-50/80 dark:bg-blue-950/40 text-google-blue-700 dark:text-blue-300 border border-google-blue-200/80 dark:border-blue-800/60 font-bold transition active:scale-95 text-left"
          >
            <Icon name="search" className="w-4 h-4 text-google-blue-600 shrink-0" />
            <span class="truncate">Pencarian &amp; Command Spotlight</span>
          </button>

          <template v-if="mode === 'admin'">
            <button
              @click="handleNav('checker')"
              class="flex items-center gap-2 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 font-bold transition-all active:scale-95 text-left"
              :class="adminView === 'checker' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300' : 'text-slate-700 dark:text-slate-200'"
            >
              <Icon name="shield" className="w-4 h-4 text-amber-600 shrink-0" />
              <span class="truncate">Pos Checker (Gate)</span>
            </button>

            <button
              @click="handleNav('recipient')"
              class="flex items-center gap-2 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 font-bold transition-all active:scale-95 text-left"
              :class="adminView === 'recipient' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300' : 'text-slate-700 dark:text-slate-200'"
            >
              <Icon name="box" className="w-4 h-4 text-emerald-600 shrink-0" />
              <span class="truncate">Tanda Terima</span>
            </button>

            <button
              @click="handleNav('users')"
              class="flex items-center gap-2 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 font-bold transition-all active:scale-95 text-left"
              :class="adminView === 'users' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300' : 'text-slate-700 dark:text-slate-200'"
            >
              <Icon name="users" className="w-4 h-4 text-google-blue-600 shrink-0" />
              <span class="truncate">Kelola Pengguna</span>
            </button>

            <button
              @click="handleNav('tutorial')"
              class="flex items-center gap-2 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 font-bold transition-all active:scale-95 text-left"
              :class="adminView === 'tutorial' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300' : 'text-slate-700 dark:text-slate-200'"
            >
              <Icon name="tutorial" className="w-4 h-4 text-indigo-600 shrink-0" />
              <span class="truncate">Buku Panduan</span>
            </button>
          </template>

          <template v-else>
            <button
              @click="handleNav('tutorial')"
              class="col-span-2 flex items-center gap-2 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 font-bold transition-all active:scale-95 text-left"
              :class="adminView === 'tutorial' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300' : 'text-slate-700 dark:text-slate-200'"
            >
              <Icon name="tutorial" className="w-4 h-4 text-indigo-600 shrink-0" />
              <span class="truncate">Buku Panduan Driver</span>
            </button>
          </template>

          <!-- Role Switcher in Mobile Drawer -->
          <button
            v-if="canSwitchRole"
            @click="$emit('toggle-mode'); showMobileDrawer = false"
            class="flex items-center gap-2 p-3 rounded-2xl border font-bold transition-all active:scale-95 text-left"
            :class="mode === 'admin' ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800' : 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800'"
          >
            <Icon name="truck" className="w-4 h-4" />
            <span class="truncate">{{ mode === 'admin' ? 'Beralih ke Driver' : 'Beralih ke Admin' }}</span>
          </button>

          <!-- Logout Button in Mobile Drawer -->
          <button
            @click="$emit('logout'); showMobileDrawer = false"
            class="flex items-center gap-2 p-3 rounded-2xl border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/40 font-bold transition-all active:scale-95 text-left"
            :class="!canSwitchRole ? 'col-span-2' : ''"
          >
            <Icon name="logout" className="w-4 h-4 text-rose-600" />
            <span class="truncate">Keluar Akun</span>
          </button>
        </div>
      </div>
    </Transition>

    <!-- Floating Frosted Bottom Dock Navigation -->
    <div class="fixed inset-x-0 bottom-0 z-40 lg:hidden px-3 pb-3 pt-1 pointer-events-none">
      <nav class="pointer-events-auto max-w-md mx-auto h-14 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xl flex items-center justify-around px-2">
        <template v-if="mode === 'admin'">
          <!-- Buat KPM -->
          <button
            type="button"
            @click="handleNav('create')"
            class="flex flex-col items-center justify-center flex-1 py-1 text-[9.5px] font-bold transition-all duration-200 active:scale-90 focus-visible:outline-none cursor-pointer"
            :class="adminView === 'create' ? 'text-google-blue-600 dark:text-google-blue-400 font-extrabold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'"
          >
            <div class="p-1 rounded-xl transition-all" :class="adminView === 'create' ? 'bg-google-blue-50 dark:bg-blue-950/50 scale-105' : ''">
              <Icon name="plus" className="w-4 h-4" />
            </div>
            <span class="mt-0.5">Buat</span>
          </button>

          <!-- Monitor -->
          <button
            type="button"
            @click="handleNav('monitor')"
            class="relative flex flex-col items-center justify-center flex-1 py-1 text-[9.5px] font-bold transition-all duration-200 active:scale-90 focus-visible:outline-none cursor-pointer"
            :class="adminView === 'monitor' ? 'text-google-blue-600 dark:text-google-blue-400 font-extrabold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'"
          >
            <div class="p-1 rounded-xl transition-all" :class="adminView === 'monitor' ? 'bg-google-blue-50 dark:bg-blue-950/50 scale-105' : ''">
              <Icon name="doc" className="w-4 h-4" />
            </div>
            <span class="mt-0.5">Pantau</span>
            <span
              v-if="activeKpmCount > 0"
              class="absolute top-0 right-1/4 w-3.5 h-3.5 rounded-full bg-google-blue-600 text-white text-[8.5px] font-black flex items-center justify-center ring-2 ring-white dark:ring-slate-900 animate-pulse"
            >
              {{ activeKpmCount }}
            </span>
          </button>

          <!-- Radar -->
          <button
            type="button"
            @click="handleNav('map')"
            class="flex flex-col items-center justify-center flex-1 py-1 text-[9.5px] font-bold transition-all duration-200 active:scale-90 focus-visible:outline-none cursor-pointer"
            :class="adminView === 'map' ? 'text-google-blue-600 dark:text-google-blue-400 font-extrabold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'"
          >
            <div class="p-1 rounded-xl transition-all" :class="adminView === 'map' ? 'bg-google-blue-50 dark:bg-blue-950/50 scale-105' : ''">
              <Icon name="map" className="w-4 h-4" />
            </div>
            <span class="mt-0.5">Radar</span>
          </button>

          <!-- Mode Driver Switch shortcut -->
          <button
            type="button"
            @click="handleNav('driver')"
            class="flex flex-col items-center justify-center flex-1 py-1 text-[9.5px] font-bold transition-all duration-200 active:scale-90 focus-visible:outline-none cursor-pointer"
            :class="adminView === 'driver' ? 'text-google-blue-600 dark:text-google-blue-400 font-extrabold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'"
          >
            <div class="p-1 rounded-xl transition-all" :class="adminView === 'driver' ? 'bg-google-blue-50 dark:bg-blue-950/50 scale-105' : ''">
              <Icon name="truck" className="w-4 h-4" />
            </div>
            <span class="mt-0.5">Driver</span>
          </button>

          <!-- Menu Lainnya -->
          <button
            type="button"
            @click="showMobileDrawer = !showMobileDrawer"
            class="flex flex-col items-center justify-center flex-1 py-1 text-[9.5px] font-bold transition-all duration-200 active:scale-90 text-slate-500 dark:text-slate-400 hover:text-slate-800 focus-visible:outline-none cursor-pointer"
          >
            <div class="p-1 rounded-xl transition-all" :class="showMobileDrawer ? 'bg-slate-100 dark:bg-slate-800 text-google-blue-600' : ''">
              <span class="text-sm font-black leading-none">⋮</span>
            </div>
            <span class="mt-0.5">Lainnya</span>
          </button>
        </template>

        <!-- Driver Mobile Bottom Nav -->
        <template v-else>
          <button
            type="button"
            @click="handleNav('driver')"
            class="relative flex flex-col items-center justify-center flex-1 py-1 text-[9.5px] transition-all duration-200 active:scale-90 cursor-pointer"
            :class="adminView !== 'tutorial' ? 'text-google-blue-600 dark:text-google-blue-400 font-extrabold' : 'text-slate-500 dark:text-slate-400 font-medium'"
          >
            <div class="p-1 rounded-xl transition-all" :class="adminView !== 'tutorial' ? 'bg-google-blue-50 dark:bg-blue-950/50 scale-105' : ''">
              <Icon name="truck" className="w-4 h-4" />
            </div>
            <span class="mt-0.5">Tugas Kirim</span>
            <span
              v-if="activeDeliveryCount > 0"
              class="absolute top-0 right-1/4 w-3.5 h-3.5 rounded-full bg-google-blue-600 text-white text-[8.5px] font-black flex items-center justify-center ring-2 ring-white dark:ring-slate-900 animate-pulse"
            >
              {{ activeDeliveryCount }}
            </span>
          </button>

          <button
            type="button"
            @click="handleNav('tutorial')"
            class="flex flex-col items-center justify-center flex-1 py-1 text-[9.5px] transition-all duration-200 active:scale-90 cursor-pointer"
            :class="adminView === 'tutorial' ? 'text-google-blue-600 dark:text-google-blue-400 font-extrabold' : 'text-slate-500 dark:text-slate-400 font-medium'"
          >
            <div class="p-1 rounded-xl transition-all" :class="adminView === 'tutorial' ? 'bg-google-blue-50 dark:bg-blue-950/50 scale-105' : ''">
              <Icon name="tutorial" className="w-4 h-4" />
            </div>
            <span class="mt-0.5">Panduan</span>
          </button>

          <button
            type="button"
            @click="showMobileDrawer = !showMobileDrawer"
            class="flex flex-col items-center justify-center flex-1 py-1 text-[9.5px] font-bold text-slate-500 dark:text-slate-400 transition-all duration-200 active:scale-90 cursor-pointer"
          >
            <div class="p-1 rounded-xl transition-all" :class="showMobileDrawer ? 'bg-slate-100 dark:bg-slate-800 text-google-blue-600' : ''">
              <span class="text-sm font-black leading-none">⋮</span>
            </div>
            <span class="mt-0.5">Menu</span>
          </button>
        </template>
      </nav>
    </div>
  </div>
</template>
