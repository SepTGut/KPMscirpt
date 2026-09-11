<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { useUiStore } from './stores/ui'
import { useAuth } from './composables/useAuth'
import { useKpm } from './composables/useKpm'
import { useTheme } from './composables/useTheme'
import { useSeo } from './composables/useSeo'
import AppSidebar from './components/AppSidebar.vue'
import AppHeader from './components/AppHeader.vue'
import MobileBottomNav from './components/MobileBottomNav.vue'
import BreadcrumbNav from './components/BreadcrumbNav.vue'
import ToastContainer from './components/ToastContainer.vue'
import Icon from './components/Icon.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const uiStore = useUiStore()
const { isDark, toggleDark } = useTheme()
const { currentUser, mode, isIT, isSuperAdmin, isAdmin, isDriver, canSwitchRole, canOverrideStatus, canManageUsers } = useAuth()
const {
  master, monitoring, deliveries, selectedDelivery, filter, filteredMonitoring,
  busy, message, error, editingKpm, editItemsList,
  loadMaster, loadMonitoring, loadDeliveries, handleCreateKpm, handleArchiveKpm,
  handleAdminChangeStatus, startEditLatestKpm, addEditItem, removeEditItem,
  saveLatestKpmItems, handleDriverStatusUpdate, cleanOrphanedAndTestRows,
  kpiStats, isPollingActive, pollingSecondsLeft, togglePolling
} = useKpm()
useSeo()

// Badge counts
const activeKpmCount = computed(() => (monitoring.value || []).filter(i => i.status !== 'Selesai').length)
const activeDeliveryCount = computed(() => (deliveries.value || []).filter(i => i.status !== 'Selesai').length)

// Role badge styling
const roleBadgeClass = computed(() => {
  if (isSuperAdmin.value || isIT.value) return 'bg-amber-100 text-amber-800 border-amber-300'
  if (isAdmin.value) return 'bg-blue-100 text-blue-800 border-blue-300'
  return 'bg-emerald-100 text-emerald-800 border-emerald-300'
})

// The current admin view key (extracted from route meta)
const adminView = computed(() => route.meta?.view || 'create')

// Is this a public (non-auth) route?
const isPublicRoute = computed(() => {
  return !route.meta?.requiresAuth || !currentUser.value
})

// Breadcrumb items computed from route
const breadcrumbs = computed(() => {
  if (!currentUser.value) return []
  if (mode.value === 'admin') {
    const crumbs = [
      { label: 'Beranda', iconName: 'home', action: () => navigate('create') },
      { label: 'Admin', action: () => navigate('create') }
    ]
    const viewLabels = {
      create: 'Buat KPM Baru', monitor: 'Pantau KPM', map: 'Live Radar Armada',
      checker: 'Pos Checker (Gate Out)', recipient: 'Konfirmasi Penerima',
      users: 'Kelola Pengguna', tutorial: 'Panduan & Tutorial'
    }
    crumbs.push({ label: viewLabels[adminView.value] || 'Admin', current: true })
    return crumbs
  }
  return [
    { label: 'Beranda', iconName: 'home', action: () => navigate('driver') },
    { label: 'Portal Driver', current: adminView.value !== 'tutorial' },
    ...(adminView.value === 'tutorial' ? [{ label: 'Panduan Driver', current: true }] : [])
  ]
})

// Navigation helper using router
function navigate(siteKey) {
  const routeMap = {
    create: '/kpm', monitor: '/kpm/monitor', map: '/kpm/map',
    checker: '/kpm/gate', recipient: '/kpm/confirm',
    users: '/kpm/users', tutorial: '/kpm/tutorial', driver: '/kpm/personel'
  }
  const target = routeMap[siteKey] || '/kpm'

  if (siteKey === 'driver') {
    authStore.switchActiveMode('user')
    router.push(target)
    loadDeliveries()
  } else {
    authStore.switchActiveMode('admin')
    router.push(target)
    if (siteKey === 'monitor' || siteKey === 'map') loadMonitoring()
  }
}

function toggleMode() {
  const newMode = mode.value === 'admin' ? 'user' : 'admin'
  authStore.switchActiveMode(newMode)
  if (newMode === 'admin') {
    loadMaster(true)
    router.push('/kpm')
  } else {
    loadDeliveries(true)
    router.push('/kpm/personel')
  }
}

function onLogout() {
  authStore.logout()
  router.push('/login')
}

function handleBreadcrumbNav(action) {
  if (typeof action === 'function') action()
}

// Short link / query param handling for recipient confirm and checker panels
const resolvedKpmNomor = computed(() => {
  return route.params?.shortId || route.query?.kpm || route.query?.confirm || route.query?.gate || ''
})

// Initial data loading
onMounted(() => {
  if (currentUser.value) {
    if (mode.value === 'admin') loadMaster(true)
    else loadDeliveries(true)
  }
})
</script>

<template>
  <!-- PUBLIC ROUTES: Login, Recipient Confirm, Checker Gate, 404 -->
  <template v-if="isPublicRoute">
    <div class="min-h-screen bg-google-surface-50 dark:bg-dark-bg text-slate-800 dark:text-slate-100">
      <div class="google-bar"></div>
      <RouterView
        :kpm-nomor="resolvedKpmNomor"
        :is-i-t="isIT"
        :busy="busy"
        :errorMessage="authStore.loginError"
        @login-credentials="async (p) => { await authStore.loginWithCredentials(p); if (mode === 'admin') loadMaster(true); else loadDeliveries(true); router.push(mode === 'admin' ? '/kpm' : '/kpm/personel') }"
        @login-google="async (p) => { await authStore.loginWithGoogle(p); if (mode === 'admin') loadMaster(true); else loadDeliveries(true); router.push(mode === 'admin' ? '/kpm' : '/kpm/personel') }"
        @back-to-home="router.push('/kpm')"
        @navigate-home="router.push('/')"
        @navigate-driver="navigate('driver')"
      />
    </div>
  </template>

  <!-- AUTHENTICATED APP: Sidebar + Header + Content -->
  <div v-else class="min-h-screen bg-google-surface-50 dark:bg-dark-bg text-slate-800 dark:text-slate-100 flex flex-col lg:flex-row font-sans">
    <!-- Desktop Sidebar -->
    <AppSidebar
      :current-user="currentUser"
      :mode="mode"
      :admin-view="adminView"
      :is-i-t="isIT"
      :is-super-admin="isSuperAdmin"
      :is-admin="isAdmin"
      :is-driver="isDriver"
      :can-switch-role="canSwitchRole"
      :role-badge-class="roleBadgeClass"
      :active-kpm-count="activeKpmCount"
      :active-delivery-count="activeDeliveryCount"
      @navigate="navigate"
      @toggle-mode="toggleMode"
      @logout="onLogout"
    />

    <!-- Main Content -->
    <div class="flex-1 flex flex-col min-w-0 pb-20 lg:pb-8">
      <div class="google-bar shrink-0"></div>

      <AppHeader
        :current-user="currentUser"
        :mode="mode"
        :admin-view="adminView"
        :is-i-t="isIT"
        :is-super-admin="isSuperAdmin"
        :is-admin="isAdmin"
        :is-driver="isDriver"
        :can-switch-role="canSwitchRole"
        :role-badge-class="roleBadgeClass"
        :is-dark="isDark"
        :is-online="uiStore.isOnline"
        @toggle-dark="toggleDark"
        @toggle-mode="toggleMode"
        @navigate="navigate"
        @logout="onLogout"
      />

      <main class="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 lg:p-8">
        <BreadcrumbNav :items="breadcrumbs" @navigate="handleBreadcrumbNav" />

        <!-- Status Notices -->
        <div v-if="error" class="mb-5 rounded-2xl border border-google-red-200/90 dark:border-red-900/50 bg-google-red-50/90 dark:bg-red-950/40 backdrop-blur-sm px-4 py-3.5 text-sm font-semibold text-google-red-700 dark:text-red-300 shadow-sm flex items-center justify-between animate-fadeIn">
          <div class="flex items-center gap-2.5">
            <Icon name="alert" className="w-4 h-4 text-google-red-600 dark:text-red-400 flex-shrink-0" />
            <span>{{ error }}</span>
          </div>
          <button @click="error = ''" class="text-google-red-700 dark:text-red-300 hover:opacity-70 font-bold p-1 rounded-lg transition"><Icon name="close" className="w-3.5 h-3.5" /></button>
        </div>

        <div v-if="message" class="mb-5 rounded-2xl border border-google-green-200/90 dark:border-emerald-900/50 bg-google-green-50/90 dark:bg-emerald-950/40 backdrop-blur-sm px-4 py-3.5 text-sm font-semibold text-google-green-700 dark:text-emerald-300 shadow-sm flex items-center justify-between animate-fadeIn">
          <div class="flex items-center gap-2.5">
            <Icon name="check" className="w-4 h-4 text-google-green-600 dark:text-emerald-400 flex-shrink-0" />
            <span>{{ message }}</span>
          </div>
          <button @click="message = ''" class="text-google-green-700 dark:text-emerald-300 hover:opacity-70 font-bold p-1 rounded-lg transition"><Icon name="close" className="w-3.5 h-3.5" /></button>
        </div>

        <!-- Dynamic Router View with props passthrough -->
        <Transition name="page-fade" mode="out-in">
          <RouterView
            v-slot="{ Component, route: viewRoute }"
          >
            <component
              :is="Component"
              :key="viewRoute.path"
              :master="master"
              :monitoring="filteredMonitoring"
              :monitoringData="monitoring"
              :deliveries="deliveries"
              :selectedDelivery="selectedDelivery"
              :driverName="authStore.driverName"
              :filter="filter"
              :busy="busy"
              :is-i-t="isIT"
              :is-super-admin="isSuperAdmin"
              :can-override-status="canOverrideStatus"
              :can-manage-users="canManageUsers"
              :kpi-stats="kpiStats"
              :is-polling-active="isPollingActive"
              :polling-seconds-left="pollingSecondsLeft"
              :editing-kpm="editingKpm"
              :edit-items-list="editItemsList"
              :kpm-nomor="resolvedKpmNomor"
              :firebaseDbUrl="master.firebaseDbUrl"
              @create="async (f) => { const r = await handleCreateKpm(f); if (r) router.push('/kpm/monitor') }"
              @update:filter="filter = $event"
              @refresh="loadMonitoring(true)"
              @refresh-deliveries="loadDeliveries(true)"
              @change-status="handleAdminChangeStatus"
              @archive="handleArchiveKpm"
              @edit-material="startEditLatestKpm"
              @clean-test="cleanOrphanedAndTestRows"
              @toggle-polling="togglePolling"
              @select-delivery="selectedDelivery = $event"
              @update-driver-name="authStore.driverName = $event"
              @submit-status-update="handleDriverStatusUpdate"
              @close="editingKpm = null"
              @add-item="addEditItem"
              @remove-item="removeEditItem"
              @save="saveLatestKpmItems"
              @back-to-home="navigate('monitor')"
            />
          </RouterView>
        </Transition>
      </main>

      <!-- Footer -->
      <footer class="mt-auto py-6 border-t border-google-surface-200/90 dark:border-slate-800 text-center text-xs text-google-surface-500 dark:text-slate-500 font-medium space-y-1">
        <p>&copy; 2026 KPM Line Feeding &bull; Unified Operations Platform &bull; <span class="font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">v1P (Production Ready)</span></p>
        <p class="text-[11px] text-google-surface-400 dark:text-slate-600">Dikembangkan oleh Setyo Guntur Samudro &bull; SMK Negeri 1 Madiun (T.I.T.L)</p>
      </footer>
    </div>

    <!-- Mobile Bottom Nav -->
    <MobileBottomNav
      :mode="mode"
      :admin-view="adminView"
      :is-i-t="isIT"
      :can-switch-role="canSwitchRole"
      :active-kpm-count="activeKpmCount"
      :active-delivery-count="activeDeliveryCount"
      @navigate="navigate"
      @toggle-mode="toggleMode"
      @logout="onLogout"
    />
  </div>

  <!-- Floating Toast Notifications -->
  <ToastContainer />
</template>
