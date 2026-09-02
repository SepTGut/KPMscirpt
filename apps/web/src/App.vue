<script setup>
import { onMounted, ref } from 'vue'
import LoginScreen from './components/LoginScreen.vue'
import LiveTrackingMap from './components/LiveTrackingMap.vue'
import AdminCreatePanel from './components/AdminCreatePanel.vue'
import AdminMonitoringPanel from './components/AdminMonitoringPanel.vue'
import MaterialEditorModal from './components/MaterialEditorModal.vue'
import DriverDeliveryPanel from './components/DriverDeliveryPanel.vue'
import { useAuth } from './composables/useAuth'
import { useKpm } from './composables/useKpm'

// Composables
const {
  currentUser,
  loginError,
  isAuthBusy,
  driverName,
  mode,
  loadSavedSession,
  loginWithCredentials,
  loginWithGoogle,
  loginWithQr,
  logout
} = useAuth()

const {
  master,
  monitoring,
  deliveries,
  selectedDelivery,
  filter,
  filteredMonitoring,
  busy,
  message,
  error,
  editingKpm,
  editItemsList,
  loadMaster,
  loadMonitoring,
  loadDeliveries,
  handleCreateKpm,
  handleArchiveKpm,
  handleAdminChangeStatus,
  startEditLatestKpm,
  addEditItem,
  removeEditItem,
  saveLatestKpmItems,
  handleDriverStatusUpdate
} = useKpm()

// Admin Navigation Tab
const adminView = ref('create')

async function onLoginCredentials(payload) {
  try {
    await loginWithCredentials(payload)
    if (mode.value === 'admin') loadMaster()
    else loadDeliveries()
  } catch {}
}

async function onLoginGoogle(payload) {
  try {
    await loginWithGoogle(payload)
    if (mode.value === 'admin') loadMaster()
    else loadDeliveries()
  } catch {}
}

function onLogout() {
  logout()
}

onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search)
  const qrAuthToken = urlParams.get('qrAuth') || urlParams.get('auth')

  if (qrAuthToken) {
    loginWithQr(qrAuthToken).then((data) => {
      if (data) {
        if (mode.value === 'admin') loadMaster()
        else loadDeliveries()
      }
    })
    return
  }

  loadSavedSession()
  if (currentUser.value) {
    if (mode.value === 'admin') loadMaster()
    else loadDeliveries()
  }
})
</script>

<template>
  <!-- Login Screen if not authenticated -->
  <LoginScreen
    v-if="!currentUser"
    :busy="isAuthBusy || busy"
    :errorMessage="loginError"
    @login-credentials="onLoginCredentials"
    @login-google="onLoginGoogle"
  />

  <!-- Authenticated App View -->
  <div v-else class="min-h-screen bg-google-surface-50 font-sans">
    <!-- Google 4-Color Accent Top Bar -->
    <div class="google-bar"></div>

    <!-- Header (Google Workspace AppBar) -->
    <header class="border-b border-google-surface-300/70 bg-white/90 backdrop-blur-md sticky top-0 z-20 shadow-sm">
      <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-google-blue-600 via-indigo-500 to-google-green-500 flex items-center justify-center font-bold text-white shadow-md shadow-google-blue-500/20 ring-1 ring-white/30">
            LF
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-xl font-bold text-google-surface-800 leading-tight">KPM Line Feeding</h1>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-google-blue-50 text-google-blue-700 border border-google-blue-200">Unified</span>
            </div>
            <p class="text-xs text-google-surface-500 font-medium">Operations & Monitoring Platform</p>
          </div>
        </div>

        <div class="flex items-center gap-2.5">
          <!-- Active User Badge -->
          <div class="flex items-center gap-2 rounded-full bg-google-surface-100 py-1 pl-3 pr-1.5 border border-google-surface-300/70 text-xs shadow-inner">
            <span class="font-bold text-google-surface-800 flex items-center gap-1.5">
              <span>{{ currentUser.role === 'admin' ? '🛡️' : '🚚' }}</span>
              <span class="text-google-blue-700 font-semibold">{{ currentUser.name || currentUser.username }}</span>
              <span class="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200 uppercase">
                {{ currentUser.role }}
              </span>
            </span>

            <!-- Logout Button -->
            <button
              type="button"
              class="rounded-full bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 px-2.5 py-1 text-xs font-bold border border-slate-200 transition shadow-sm"
              @click="onLogout"
              title="Keluar / Ganti Akun"
            >
              Keluar ➔
            </button>
          </div>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <!-- Notices -->
      <div v-if="error" class="mb-5 rounded-2xl border border-google-red-200 bg-google-red-50 px-4 py-3.5 text-sm font-semibold text-google-red-700 shadow-sm flex items-center justify-between animate-fadeIn">
        <div class="flex items-center gap-2">
          <span>⚠️</span>
          <span>{{ error }}</span>
        </div>
        <button @click="error = ''" class="text-google-red-700 hover:opacity-70 font-bold">✕</button>
      </div>

      <div v-if="message" class="mb-5 rounded-2xl border border-google-green-200 bg-google-green-50 px-4 py-3.5 text-sm font-semibold text-google-green-700 shadow-sm flex items-center justify-between animate-fadeIn">
        <div class="flex items-center gap-2">
          <span>✓</span>
          <span>{{ message }}</span>
        </div>
        <button @click="message = ''" class="text-google-green-700 hover:opacity-70 font-bold">✕</button>
      </div>

      <!-- ADMIN SECTION -->
      <section v-if="currentUser.role === 'admin'">
        <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 class="text-xl font-bold text-google-surface-800">Admin Dashboard</h2>
            <p class="text-xs text-google-surface-500 mt-0.5">Buat penugasan baru dan pantau pergerakan KPM secara real-time.</p>
          </div>

          <!-- M3 Segmented Navigation Tabs -->
          <div class="flex bg-google-surface-100 p-1 rounded-full border border-google-surface-300/70 shadow-sm flex-wrap gap-1">
            <button
              class="rounded-full px-4 py-2 text-xs font-bold transition-all duration-200"
              :class="adminView === 'create' ? 'bg-gradient-to-r from-google-blue-600 to-indigo-600 text-white shadow-sm' : 'text-google-surface-600 hover:text-google-surface-900'"
              @click="adminView = 'create'"
            >
              📝 Buat KPM Baru
            </button>
            <button
              class="rounded-full px-4 py-2 text-xs font-bold transition-all duration-200"
              :class="adminView === 'monitor' ? 'bg-gradient-to-r from-google-blue-600 to-indigo-600 text-white shadow-sm' : 'text-google-surface-600 hover:text-google-surface-900'"
              @click="adminView = 'monitor'; loadMonitoring()"
            >
              📊 Pantau KPM ({{ monitoring.length }})
            </button>
            <button
              class="rounded-full px-4 py-2 text-xs font-bold transition-all duration-200"
              :class="adminView === 'map' ? 'bg-gradient-to-r from-google-blue-600 to-indigo-600 text-white shadow-sm' : 'text-google-surface-600 hover:text-google-surface-900'"
              @click="adminView = 'map'; loadMonitoring()"
            >
              🗺️ Live Radar Armada
            </button>
          </div>
        </div>

        <!-- CREATE KPM PANEL -->
        <AdminCreatePanel
          v-if="adminView === 'create'"
          :master="master"
          :busy="busy"
          @create="handleCreateKpm"
        />

        <!-- MONITORING PANEL -->
        <AdminMonitoringPanel
          v-else-if="adminView === 'monitor'"
          :monitoring="filteredMonitoring"
          :master="master"
          :busy="busy"
          :filter="filter"
          @update:filter="filter = $event"
          @refresh="loadMonitoring(true)"
          @change-status="handleAdminChangeStatus"
          @archive="handleArchiveKpm"
          @edit-material="startEditLatestKpm"
        />

        <!-- LIVE RADAR FLEET MAP VIEW -->
        <div v-else-if="adminView === 'map'">
          <LiveTrackingMap
            :monitoringData="monitoring"
            :firebaseDbUrl="master.firebaseDbUrl"
          />
        </div>

        <!-- MODAL: KELOLA MATERIAL KPM TERBARU -->
        <MaterialEditorModal
          :editingKpm="editingKpm"
          :editItemsList="editItemsList"
          :master="master"
          :busy="busy"
          @close="editingKpm = null"
          @add-item="addEditItem"
          @remove-item="removeEditItem"
          @save="saveLatestKpmItems"
        />
      </section>

      <!-- PERSONEL / DRIVER SECTION -->
      <DriverDeliveryPanel
        v-else
        :deliveries="deliveries"
        :selectedDelivery="selectedDelivery"
        :driverName="driverName"
        :busy="busy"
        @select-delivery="selectedDelivery = $event"
        @refresh-deliveries="loadDeliveries(true)"
        @update-driver-name="driverName = $event"
        @submit-status-update="handleDriverStatusUpdate"
      />
    </main>
  </div>
</template>
