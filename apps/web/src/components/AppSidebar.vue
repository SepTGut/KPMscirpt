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
    class="hidden lg:flex flex-col border-r border-google-surface-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300 z-30 select-none shrink-0"
    :class="isCollapsed ? 'w-20' : 'w-64'"
  >
    <!-- Brand & Collapse Header -->
    <div class="h-16 px-4 flex items-center justify-between border-b border-google-surface-200/80 dark:border-slate-800">
      <div v-if="!isCollapsed" class="flex items-center gap-2.5 overflow-hidden">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-google-blue-600 via-indigo-600 to-google-green-500 flex items-center justify-center font-bold text-white text-sm shadow-md shadow-google-blue-500/20 shrink-0">
          LF
        </div>
        <div class="min-w-0">
          <div class="flex items-center gap-1.5">
            <span class="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight truncate">KPM Line Feeding</span>
          </div>
          <span class="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            v1P • PROD
          </span>
        </div>
      </div>
      <div v-else class="mx-auto">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-google-blue-600 via-indigo-600 to-google-green-500 flex items-center justify-center font-bold text-white text-sm shadow-md">
          LF
        </div>
      </div>

      <button
        type="button"
        class="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition focus-visible:outline-none"
        :class="isCollapsed ? 'mx-auto mt-2' : ''"
        @click="toggleSidebar"
        :title="isCollapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'"
      >
        <span class="text-xs">{{ isCollapsed ? '▶' : '◀' }}</span>
      </button>
    </div>

    <!-- Active User Profile Card -->
    <div class="p-3 border-b border-google-surface-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
      <div class="flex items-center gap-2.5" :class="isCollapsed ? 'justify-center' : ''">
        <div class="w-8 h-8 rounded-full bg-google-blue-100 dark:bg-slate-800 flex items-center justify-center text-google-blue-700 dark:text-google-blue-400 shrink-0 font-bold text-xs border border-google-blue-200 dark:border-slate-700">
          <Icon :name="(isSuperAdmin || isIT) ? 'crown' : (isAdmin ? 'shield' : 'truck')" className="w-4 h-4" />
        </div>
        <div v-if="!isCollapsed" class="min-w-0 flex-1">
          <p class="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
            {{ currentUser.name || currentUser.username }}
          </p>
          <span
            class="inline-block text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full border shadow-2xs mt-0.5"
            :class="roleBadgeClass"
          >
            {{ isIT ? 'Super Admin' : (currentUser.roleLabel || currentUser.role) }}
          </span>
        </div>
      </div>

      <!-- Mode Switcher for Super Admin -->
      <div v-if="canSwitchRole && !isCollapsed" class="mt-2.5">
        <button
          type="button"
          class="w-full rounded-xl py-1.5 px-2.5 text-xs font-bold transition border flex items-center justify-center gap-1.5 focus-visible:outline-none shadow-2xs"
          :class="mode === 'admin' ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800' : 'bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'"
          @click="$emit('toggle-mode')"
        >
          <Icon name="switch" className="w-3.5 h-3.5" />
          <span>{{ mode === 'admin' ? 'Beralih ke Mode Driver' : 'Beralih ke Mode Admin' }}</span>
        </button>
      </div>
    </div>

    <!-- Navigation Links -->
    <nav class="flex-1 overflow-y-auto p-3 space-y-1">
      <template v-if="mode === 'admin'">
        <div v-if="!isCollapsed" class="px-2 pt-2 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Manajemen KPM
        </div>

        <button
          type="button"
          @click="handleNav('create')"
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition-all duration-150 group"
          :class="adminView === 'create' ? 'bg-google-blue-600 text-white shadow-md shadow-google-blue-500/20' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'"
          :title="isCollapsed ? 'Buat KPM Baru' : ''"
        >
          <Icon name="plus" className="w-4 h-4 shrink-0" />
          <span v-if="!isCollapsed" class="truncate">Buat KPM Baru</span>
        </button>

        <button
          type="button"
          @click="handleNav('monitor')"
          class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs transition-all duration-150 group"
          :class="adminView === 'monitor' ? 'bg-google-blue-600 text-white shadow-md shadow-google-blue-500/20' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'"
          :title="isCollapsed ? 'Monitoring KPM' : ''"
        >
          <div class="flex items-center gap-3 truncate">
            <Icon name="doc" className="w-4 h-4 shrink-0" />
            <span v-if="!isCollapsed" class="truncate">Monitoring KPM</span>
          </div>
          <span
            v-if="!isCollapsed && activeKpmCount > 0"
            class="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full"
            :class="adminView === 'monitor' ? 'bg-white/20 text-white' : 'bg-google-blue-50 text-google-blue-700 dark:bg-google-blue-950 dark:text-google-blue-300'"
          >
            {{ activeKpmCount }}
          </span>
        </button>

        <button
          type="button"
          @click="handleNav('map')"
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition-all duration-150 group"
          :class="adminView === 'map' ? 'bg-google-blue-600 text-white shadow-md shadow-google-blue-500/20' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'"
          :title="isCollapsed ? 'Live Radar Armada' : ''"
        >
          <Icon name="map" className="w-4 h-4 shrink-0" />
          <span v-if="!isCollapsed" class="truncate">Live Radar Armada</span>
        </button>

        <div v-if="!isCollapsed" class="px-2 pt-4 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Pos & Serah Terima
        </div>

        <button
          type="button"
          @click="handleNav('checker')"
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition-all duration-150 group"
          :class="adminView === 'checker' ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'"
          :title="isCollapsed ? 'Pos Checker Gerbang' : ''"
        >
          <Icon name="shield" className="w-4 h-4 shrink-0" />
          <span v-if="!isCollapsed" class="truncate">Pos Checker (Gate Out)</span>
        </button>

        <button
          type="button"
          @click="handleNav('recipient')"
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition-all duration-150 group"
          :class="adminView === 'recipient' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'"
          :title="isCollapsed ? 'Penerima Workshop' : ''"
        >
          <Icon name="box" className="w-4 h-4 shrink-0" />
          <span v-if="!isCollapsed" class="truncate">Penerima (Tanda Terima)</span>
        </button>

        <div v-if="!isCollapsed" class="px-2 pt-4 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Sistem & Bantuan
        </div>

        <button
          type="button"
          @click="handleNav('users')"
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition-all duration-150 group"
          :class="adminView === 'users' ? 'bg-google-blue-600 text-white shadow-md shadow-google-blue-500/20' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'"
          :title="isCollapsed ? 'Kelola Pengguna' : ''"
        >
          <Icon name="users" className="w-4 h-4 shrink-0" />
          <span v-if="!isCollapsed" class="truncate">Kelola Pengguna</span>
        </button>

        <button
          type="button"
          @click="handleNav('tutorial')"
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition-all duration-150 group"
          :class="adminView === 'tutorial' ? 'bg-google-blue-600 text-white shadow-md shadow-google-blue-500/20' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'"
          :title="isCollapsed ? 'Panduan & Tutorial' : ''"
        >
          <Icon name="tutorial" className="w-4 h-4 shrink-0" />
          <span v-if="!isCollapsed" class="truncate">Panduan & Tutorial</span>
        </button>
      </template>

      <!-- Driver Menu -->
      <template v-else>
        <div v-if="!isCollapsed" class="px-2 pt-2 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Operasional Lapangan
        </div>

        <button
          type="button"
          @click="handleNav('driver')"
          class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs transition-all duration-150"
          :class="adminView !== 'tutorial' ? 'bg-google-blue-600 text-white shadow-md shadow-google-blue-500/20' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'"
          :title="isCollapsed ? 'Daftar Tugas Pengiriman' : ''"
        >
          <div class="flex items-center gap-3 truncate">
            <Icon name="truck" className="w-4 h-4 shrink-0" />
            <span v-if="!isCollapsed" class="truncate">Tugas Pengiriman</span>
          </div>
          <span
            v-if="!isCollapsed && activeDeliveryCount > 0"
            class="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full"
            :class="adminView !== 'tutorial' ? 'bg-white/20 text-white' : 'bg-google-blue-50 text-google-blue-700 dark:bg-google-blue-950 dark:text-google-blue-300'"
          >
            {{ activeDeliveryCount }}
          </span>
        </button>

        <button
          type="button"
          @click="handleNav('tutorial')"
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition-all duration-150"
          :class="adminView === 'tutorial' ? 'bg-google-blue-600 text-white shadow-md shadow-google-blue-500/20' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'"
          :title="isCollapsed ? 'Panduan Driver' : ''"
        >
          <Icon name="tutorial" className="w-4 h-4 shrink-0" />
          <span v-if="!isCollapsed" class="truncate">Panduan Driver</span>
        </button>
      </template>
    </nav>

    <!-- Footer Controls: Logout -->
    <div class="p-3 border-t border-google-surface-200/80 dark:border-slate-800">
      <!-- Logout Button -->
      <button
        type="button"
        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition focus-visible:outline-none"
        :class="isCollapsed ? 'justify-center' : ''"
        @click="$emit('logout')"
        title="Keluar Akun"
      >
        <Icon name="close" className="w-4 h-4 shrink-0" />
        <span v-if="!isCollapsed" class="truncate">Keluar Akun</span>
      </button>
    </div>
  </aside>
</template>
