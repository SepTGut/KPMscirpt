<script setup>
import { ref } from 'vue'
import Icon from './Icon.vue'

const props = defineProps({
  currentUser: { type: Object, required: true },
  mode: { type: String, required: true },
  adminView: { type: String, required: true },
  isIT: { type: Boolean, default: false },
  isSuperAdmin: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },
  isDriver: { type: Boolean, default: false },
  canSwitchRole: { type: Boolean, default: false },
  roleBadgeClass: { type: String, default: '' },
  activeKpmCount: { type: Number, default: 0 },
  activeDeliveryCount: { type: Number, default: 0 }
})

const emit = defineEmits(['navigate', 'toggle-mode', 'logout'])

const isCollapsed = ref(false)

function toggleSidebar() {
  isCollapsed.value = !isCollapsed.value
}

function handleNav(view) {
  emit('navigate', view)
}
</script>

<template>
  <aside
    class="hidden lg:flex flex-col border-r border-google-surface-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl transition-all duration-300 z-30 select-none shrink-0"
    :class="isCollapsed ? 'w-[72px]' : 'w-64'"
  >
    <!-- Brand Header & Collapse Toggle -->
    <div class="h-14 px-3.5 flex items-center justify-between border-b border-google-surface-200/80 dark:border-slate-800">
      <div v-if="!isCollapsed" class="flex items-center gap-2.5 overflow-hidden">
        <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-google-blue-600 via-indigo-600 to-google-green-500 flex items-center justify-center font-bold text-white text-xs shadow-md shadow-google-blue-500/20 shrink-0 transition-transform duration-300 hover:rotate-6 hover:scale-105">
          LF
        </div>
        <div class="min-w-0">
          <div class="flex items-center gap-1">
            <span class="text-xs font-black text-slate-900 dark:text-slate-100 tracking-tight truncate">KPM Line Feeding</span>
          </div>
          <span class="text-[8.5px] font-extrabold px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 inline-flex items-center gap-1">
            <span class="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
            PROD v1P
          </span>
        </div>
      </div>
      <div v-else class="mx-auto">
        <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-google-blue-600 via-indigo-600 to-google-green-500 flex items-center justify-center font-bold text-white text-xs shadow-md shadow-google-blue-500/20">
          LF
        </div>
      </div>

      <button
        type="button"
        class="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-all duration-200 active:scale-90 focus-visible:outline-none cursor-pointer"
        :class="isCollapsed ? 'mx-auto mt-2 hidden' : ''"
        @click="toggleSidebar"
        :title="isCollapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'"
      >
        <span class="text-xs transition-transform duration-200" :class="isCollapsed ? 'rotate-180' : ''">◀</span>
      </button>
    </div>

    <!-- Active User Profile Card -->
    <div class="p-2.5 border-b border-google-surface-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
      <div class="flex items-center gap-2" :class="isCollapsed ? 'justify-center' : ''">
        <div class="w-8 h-8 rounded-xl bg-google-blue-100 dark:bg-slate-800 flex items-center justify-center text-google-blue-700 dark:text-google-blue-400 shrink-0 font-bold text-xs border border-google-blue-200 dark:border-slate-700 shadow-2xs">
          <Icon :name="(isSuperAdmin || isIT) ? 'crown' : (isAdmin ? 'shield' : 'truck')" className="w-3.5 h-3.5" />
        </div>
        <div v-if="!isCollapsed" class="min-w-0 flex-1">
          <p class="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
            {{ currentUser.name || currentUser.username }}
          </p>
          <span
            class="inline-block text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full border shadow-2xs"
            :class="roleBadgeClass"
          >
            {{ isIT ? 'Super Admin' : (currentUser.roleLabel || currentUser.role) }}
          </span>
        </div>
      </div>

      <!-- Mode Switcher for Super Admin / IT -->
      <div v-if="canSwitchRole && !isCollapsed" class="mt-2">
        <button
          type="button"
          class="w-full rounded-xl py-1 px-2 text-[11px] font-bold transition-all duration-200 active:scale-[0.97] border flex items-center justify-center gap-1.5 focus-visible:outline-none shadow-2xs hover:shadow-xs cursor-pointer"
          :class="mode === 'admin' ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800' : 'bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'"
          @click="$emit('toggle-mode')"
        >
          <Icon name="truck" className="w-3 h-3" />
          <span>{{ mode === 'admin' ? 'Beralih ke Mode Driver' : 'Beralih ke Mode Admin' }}</span>
        </button>
      </div>
    </div>

    <!-- Navigation Menu Items -->
    <nav class="flex-1 overflow-y-auto p-2 space-y-1">
      <template v-if="mode === 'admin'">
        <div v-if="!isCollapsed" class="px-2 pt-2 pb-1 text-[9.5px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Operasional KPM
        </div>

        <!-- Buat KPM Baru -->
        <button
          type="button"
          @click="handleNav('create')"
          class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl font-bold text-xs transition-all duration-200 active:scale-[0.98] group relative cursor-pointer"
          :class="adminView === 'create' ? 'bg-google-blue-600 text-white shadow-md shadow-google-blue-500/25' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'"
          :title="isCollapsed ? 'Buat KPM Baru' : ''"
        >
          <Icon name="plus" className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
          <span v-if="!isCollapsed" class="truncate">Buat KPM Baru</span>
          <!-- Collapsed Tooltip -->
          <div v-if="isCollapsed" class="absolute left-full ml-2 px-2.5 py-1 bg-slate-900 text-white text-[11px] rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
            Buat KPM Baru
          </div>
        </button>

        <!-- Monitoring KPM -->
        <button
          type="button"
          @click="handleNav('monitor')"
          class="w-full flex items-center justify-between px-2.5 py-2 rounded-xl font-bold text-xs transition-all duration-200 active:scale-[0.98] group relative cursor-pointer"
          :class="adminView === 'monitor' ? 'bg-google-blue-600 text-white shadow-md shadow-google-blue-500/25' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'"
          :title="isCollapsed ? 'Monitoring KPM' : ''"
        >
          <div class="flex items-center gap-2.5 truncate">
            <Icon name="doc" className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
            <span v-if="!isCollapsed" class="truncate">Monitoring KPM</span>
          </div>
          <span
            v-if="!isCollapsed && activeKpmCount > 0"
            class="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full transition-transform group-hover:scale-105"
            :class="adminView === 'monitor' ? 'bg-white/25 text-white' : 'bg-google-blue-50 text-google-blue-700 dark:bg-google-blue-950 dark:text-google-blue-300'"
          >
            {{ activeKpmCount }}
          </span>
          <span
            v-if="isCollapsed && activeKpmCount > 0"
            class="w-2 h-2 rounded-full bg-emerald-500 absolute top-2 right-2 animate-pulse"
          ></span>
          <!-- Collapsed Tooltip -->
          <div v-if="isCollapsed" class="absolute left-full ml-2 px-2.5 py-1 bg-slate-900 text-white text-[11px] rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
            Monitoring KPM ({{ activeKpmCount }})
          </div>
        </button>

        <!-- Live Radar Armada -->
        <button
          type="button"
          @click="handleNav('map')"
          class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl font-bold text-xs transition-all duration-200 active:scale-[0.98] group relative cursor-pointer"
          :class="adminView === 'map' ? 'bg-google-blue-600 text-white shadow-md shadow-google-blue-500/25' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'"
          :title="isCollapsed ? 'Live Radar Armada' : ''"
        >
          <Icon name="map" className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
          <span v-if="!isCollapsed" class="truncate">Live Radar Armada</span>
          <span v-if="!isCollapsed" class="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
          <!-- Collapsed Tooltip -->
          <div v-if="isCollapsed" class="absolute left-full ml-2 px-2.5 py-1 bg-slate-900 text-white text-[11px] rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
            Live Radar Armada
          </div>
        </button>

        <div v-if="!isCollapsed" class="px-2 pt-3 pb-1 text-[9.5px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Pos Lapangan
        </div>

        <!-- Pos Checker Gate -->
        <button
          type="button"
          @click="handleNav('checker')"
          class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl font-bold text-xs transition-all duration-200 active:scale-[0.98] group relative cursor-pointer"
          :class="adminView === 'checker' ? 'bg-amber-600 text-white shadow-md shadow-amber-500/25' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'"
          :title="isCollapsed ? 'Pos Checker Gerbang' : ''"
        >
          <Icon name="shield" className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110 text-amber-500" />
          <span v-if="!isCollapsed" class="truncate">Pos Checker (Gate Out)</span>
          <!-- Collapsed Tooltip -->
          <div v-if="isCollapsed" class="absolute left-full ml-2 px-2.5 py-1 bg-slate-900 text-white text-[11px] rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
            Pos Checker (Gate Out)
          </div>
        </button>

        <!-- Konfirmasi Penerima -->
        <button
          type="button"
          @click="handleNav('recipient')"
          class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl font-bold text-xs transition-all duration-200 active:scale-[0.98] group relative cursor-pointer"
          :class="adminView === 'recipient' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'"
          :title="isCollapsed ? 'Konfirmasi Penerima' : ''"
        >
          <Icon name="box" className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110 text-emerald-500" />
          <span v-if="!isCollapsed" class="truncate">Tanda Terima (Workshop)</span>
          <!-- Collapsed Tooltip -->
          <div v-if="isCollapsed" class="absolute left-full ml-2 px-2.5 py-1 bg-slate-900 text-white text-[11px] rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
            Tanda Terima (Workshop)
          </div>
        </button>

        <div v-if="!isCollapsed" class="px-2 pt-3 pb-1 text-[9.5px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Sistem & Bantuan
        </div>

        <!-- Kelola Pengguna (Super Admin / IT) -->
        <button
          v-if="isSuperAdmin || isIT"
          type="button"
          @click="handleNav('users')"
          class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl font-bold text-xs transition-all duration-200 active:scale-[0.98] group relative cursor-pointer"
          :class="adminView === 'users' ? 'bg-google-blue-600 text-white shadow-md shadow-google-blue-500/25' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'"
          :title="isCollapsed ? 'Kelola Pengguna' : ''"
        >
          <Icon name="users" className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
          <span v-if="!isCollapsed" class="truncate">Kelola Pengguna</span>
          <!-- Collapsed Tooltip -->
          <div v-if="isCollapsed" class="absolute left-full ml-2 px-2.5 py-1 bg-slate-900 text-white text-[11px] rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
            Kelola Pengguna
          </div>
        </button>

        <!-- Panduan & Tutorial -->
        <button
          type="button"
          @click="handleNav('tutorial')"
          class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl font-bold text-xs transition-all duration-200 active:scale-[0.98] group relative cursor-pointer"
          :class="adminView === 'tutorial' ? 'bg-google-blue-600 text-white shadow-md shadow-google-blue-500/25' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'"
          :title="isCollapsed ? 'Panduan & Tutorial' : ''"
        >
          <Icon name="tutorial" className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
          <span v-if="!isCollapsed" class="truncate">Buku Panduan</span>
          <!-- Collapsed Tooltip -->
          <div v-if="isCollapsed" class="absolute left-full ml-2 px-2.5 py-1 bg-slate-900 text-white text-[11px] rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
            Buku Panduan
          </div>
        </button>
      </template>

      <!-- Mode Driver Navigation -->
      <template v-else>
        <div v-if="!isCollapsed" class="px-2 pt-2 pb-1 text-[9.5px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Portal Lapangan
        </div>

        <button
          type="button"
          @click="handleNav('driver')"
          class="w-full flex items-center justify-between px-2.5 py-2 rounded-xl font-bold text-xs transition-all duration-200 active:scale-[0.98] group relative cursor-pointer"
          :class="adminView === 'driver' ? 'bg-google-blue-600 text-white shadow-md shadow-google-blue-500/25' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'"
          :title="isCollapsed ? 'Tugas Pengantaran' : ''"
        >
          <div class="flex items-center gap-2.5 truncate">
            <Icon name="truck" className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
            <span v-if="!isCollapsed" class="truncate">Tugas Pengantaran</span>
          </div>
          <span
            v-if="!isCollapsed && activeDeliveryCount > 0"
            class="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full"
            :class="adminView === 'driver' ? 'bg-white/25 text-white' : 'bg-google-blue-50 text-google-blue-700 dark:bg-google-blue-950 dark:text-google-blue-300'"
          >
            {{ activeDeliveryCount }}
          </span>
          <!-- Collapsed Tooltip -->
          <div v-if="isCollapsed" class="absolute left-full ml-2 px-2.5 py-1 bg-slate-900 text-white text-[11px] rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
            Tugas Driver ({{ activeDeliveryCount }})
          </div>
        </button>

        <button
          type="button"
          @click="handleNav('tutorial')"
          class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl font-bold text-xs transition-all duration-200 active:scale-[0.98] group relative cursor-pointer"
          :class="adminView === 'tutorial' ? 'bg-google-blue-600 text-white shadow-md shadow-google-blue-500/25' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'"
          :title="isCollapsed ? 'Panduan Driver' : ''"
        >
          <Icon name="tutorial" className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
          <span v-if="!isCollapsed" class="truncate">Panduan Driver</span>
          <!-- Collapsed Tooltip -->
          <div v-if="isCollapsed" class="absolute left-full ml-2 px-2.5 py-1 bg-slate-900 text-white text-[11px] rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
            Panduan Driver
          </div>
        </button>
      </template>
    </nav>

    <!-- Sidebar Footer with Collapse Toggle & Logout -->
    <div class="p-2 border-t border-google-surface-200/80 dark:border-slate-800 flex items-center justify-between gap-1">
      <button
        type="button"
        @click="toggleSidebar"
        class="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        :class="isCollapsed ? 'justify-center' : ''"
        :title="isCollapsed ? 'Perluas Menu' : 'Ciutkan Menu'"
      >
        <span class="text-xs transition-transform duration-200" :class="isCollapsed ? 'rotate-180' : ''">◀</span>
        <span v-if="!isCollapsed" class="text-[11px]">Ciutkan</span>
      </button>

      <button
        type="button"
        @click="$emit('logout')"
        class="flex items-center justify-center w-8 h-8 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition active:scale-95 cursor-pointer"
        title="Keluar / Ganti Akun"
      >
        <Icon name="logout" className="w-3.5 h-3.5" />
      </button>
    </div>
  </aside>
</template>
