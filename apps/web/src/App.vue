<script setup>
import { onMounted, ref, computed, watch } from 'vue'
import LoginScreen from './components/LoginScreen.vue'
import LiveTrackingMap from './components/LiveTrackingMap.vue'
import AdminCreatePanel from './components/AdminCreatePanel.vue'
import AdminMonitoringPanel from './components/AdminMonitoringPanel.vue'
import MaterialEditorModal from './components/MaterialEditorModal.vue'
import DriverDeliveryPanel from './components/DriverDeliveryPanel.vue'
import BreadcrumbNav from './components/BreadcrumbNav.vue'
import NotFoundView from './components/NotFoundView.vue'
import UserManagementPanel from './components/UserManagementPanel.vue'
import TutorialPanel from './components/TutorialPanel.vue'
import RecipientConfirmPanel from './components/RecipientConfirmPanel.vue'
import { useAuth } from './composables/useAuth'
import { useKpm } from './composables/useKpm'

const showDriverTutorial = ref(false)

// Composables
const {
  currentUser,
  loginError,
  isAuthBusy,
  driverName,
  mode,
  isLoggedIn,
  isIT,
  isSuperAdmin,
  isAdmin,
  isDriver,
  canSwitchRole,
  canOverrideStatus,
  canManageUsers,
  canSystemDiagnostics,
  switchActiveMode,
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

// SPA Route & 404 Detection
const currentPath = ref(typeof window !== 'undefined' ? window.location.pathname.replace(/\/+$/, '') || '/' : '/')
const validRoutes = ['/', '', '/kpm', '/kpm/personel', '/personel', '/admin', '/kpm/confirm', '/confirm']
const isRecipientConfirm = computed(() => {
  return currentPath.value === '/kpm/confirm' || currentPath.value === '/confirm' || (typeof window !== 'undefined' && window.location.search.includes('confirm='))
})
const isNotFound = ref(!validRoutes.includes(currentPath.value))

function goToHome() {
  isNotFound.value = false
  currentPath.value = '/'
  if (typeof window !== 'undefined') {
    window.history.replaceState({}, document.title, '/')
  }
}

function goToDriver() {
  isNotFound.value = false
  currentPath.value = '/kpm/personel'
  if (typeof window !== 'undefined') {
    window.history.replaceState({}, document.title, '/kpm/personel')
  }
  if (currentUser.value) {
    switchActiveMode('user')
    loadDeliveries()
  }
}

function handleBreadcrumbNav(action) {
  if (typeof action === 'function') action()
}

const roleBadgeClass = computed(() => {
  if (isIT.value) return 'bg-purple-100 text-purple-800 border-purple-300'
  if (isSuperAdmin.value) return 'bg-amber-100 text-amber-800 border-amber-300'
  if (isAdmin.value) return 'bg-blue-100 text-blue-800 border-blue-300'
  return 'bg-emerald-100 text-emerald-800 border-emerald-300'
})

function toggleMode() {
  const newMode = mode.value === 'admin' ? 'user' : 'admin'
  switchActiveMode(newMode)
  if (newMode === 'admin') {
    loadMaster()
  } else {
    loadDeliveries()
  }
}

// Dynamic SEO metadata
function updateSeoMetadata() {
  if (typeof document === 'undefined') return
  let title = 'KPM Line Feeding - Sistem Operasi & Pelacakan Logistik'
  let desc = 'Sistem operasi dan pemantauan distribusi material KPM Line Feeding secara real-time, pelacakan GPS armada terpadu, dan bukti pengiriman digital.'
  let canonicalPath = '/'

  if (isRecipientConfirm.value) {
    title = 'Konfirmasi Penerimaan KPM - KPM Line Feeding'
    desc = 'Halaman konfirmasi serah terima material pengiriman KPM Line Feeding.'
    canonicalPath = '/kpm/confirm'
  } else if (isNotFound.value) {
    title = '404: Halaman Tidak Ditemukan - KPM Line Feeding'
    desc = 'Halaman yang Anda cari tidak ditemukan pada sistem KPM Line Feeding.'
    canonicalPath = currentPath.value
  } else if (!currentUser.value) {
    title = 'Masuk ke Sistem - KPM Line Feeding'
    desc = 'Pintu masuk otentikasi terpadu KPM Line Feeding untuk administrator dan pengemudi armada.'
    canonicalPath = '/'
  } else if (mode.value === 'admin') {
    canonicalPath = '/kpm'
    if (adminView.value === 'create') {
      title = 'Buat KPM Baru - KPM Line Feeding'
      desc = 'Formulir penerbitan surat Kartu Pemindahan Material (KPM) baru antar workshop dan proyek.'
    } else if (adminView.value === 'monitor') {
      title = 'Pantau Status KPM - KPM Line Feeding'
      desc = 'Pantau pergerakan, status perjalanan, dan progres pengiriman KPM Line Feeding secara real-time.'
    } else if (adminView.value === 'map') {
      title = 'Live Radar Pelacakan Armada - KPM Line Feeding'
      desc = 'Peta radar interaktif pemantauan GPS posisi armada pengiriman KPM secara langsung.'
    } else if (adminView.value === 'users') {
      title = 'Kelola Pengguna Sistem - KPM Line Feeding'
      desc = 'Manajemen pengguna, peranan, dan pencetakan ID Card QR Login KPM Line Feeding.'
    } else if (adminView.value === 'tutorial') {
      title = 'Panduan & Tutorial Aplikasi - KPM Line Feeding'
      desc = 'Panduan lengkap penggunaan aplikasi KPM Line Feeding untuk Administrator, Driver, dan Super Admin.'
    }
  } else {
    title = 'Portal Penugasan Driver - KPM Line Feeding'
    desc = 'Portal pembaruan status keberangkatan, tiba, dan unggah foto bukti pengiriman bagi personel driver.'
    canonicalPath = '/kpm/personel'
  }

  document.title = title
  const metaDesc = document.querySelector('meta[name="description"]')
  if (metaDesc) metaDesc.setAttribute('content', desc)
  const canonicalLink = document.querySelector('link[rel="canonical"]')
  if (canonicalLink) {
    const baseOrigin = window.location.origin || 'https://combined-app-eight.vercel.app'
    canonicalLink.setAttribute('href', `${baseOrigin}${canonicalPath}`)
  }
}

watch([currentUser, adminView, isNotFound, currentPath, mode], () => {
  updateSeoMetadata()
}, { immediate: true })

const breadcrumbs = computed(() => {
  if (isRecipientConfirm.value) {
    return [
      { label: 'Beranda', icon: '🏠', action: goToHome },
      { label: 'Konfirmasi Penerimaan', current: true }
    ]
  }
  if (isNotFound.value) {
    return [
      { label: 'Beranda', icon: '🏠', action: goToHome },
      { label: '404 Tidak Ditemukan', current: true }
    ]
  }
  if (!currentUser.value) {
    return [
      { label: 'Beranda', icon: '🏠' },
      { label: 'Otentikasi Masuk', current: true }
    ]
  }
  if (mode.value === 'admin') {
    const crumbs = [
      { label: 'Beranda', icon: '🏠', action: () => { adminView.value = 'create' } },
      { label: 'Admin', action: () => { adminView.value = 'create' } }
    ]
    if (adminView.value === 'create') {
      crumbs.push({ label: 'Buat KPM Baru', current: true })
    } else if (adminView.value === 'monitor') {
      crumbs.push({ label: 'Pantau KPM', current: true })
    } else if (adminView.value === 'map') {
      crumbs.push({ label: 'Live Radar Armada', current: true })
    } else if (adminView.value === 'users') {
      crumbs.push({ label: 'Kelola Pengguna', current: true })
    } else if (adminView.value === 'tutorial') {
      crumbs.push({ label: 'Panduan & Tutorial', current: true })
    }
    return crumbs
  }
  return [
    { label: 'Beranda', icon: '🏠', action: goToHome },
    { label: 'Portal Driver', current: true }
  ]
})

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
  <!-- Recipient Confirmation View (when QR code is scanned) -->
  <div v-if="isRecipientConfirm" class="min-h-screen bg-google-surface-50 flex flex-col justify-center items-center px-4 py-8">
    <div class="google-bar fixed top-0 left-0 right-0 z-30"></div>
    <RecipientConfirmPanel @back-to-home="goToHome" />
  </div>

  <!-- 404 View when unauthenticated on unknown route -->
  <div v-else-if="isNotFound && !currentUser" class="min-h-screen bg-google-surface-50 flex flex-col justify-center items-center px-4 py-8">
    <div class="google-bar fixed top-0 left-0 right-0 z-30"></div>
    <NotFoundView
      :path="currentPath"
      @navigate-home="goToHome"
      @navigate-driver="goToDriver"
    />
  </div>

  <!-- Login Screen if not authenticated -->
  <LoginScreen
    v-else-if="!currentUser"
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
              <span class="text-xl font-bold text-google-surface-800 leading-tight">KPM Line Feeding</span>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-google-blue-50 text-google-blue-700 border border-google-blue-200">Unified</span>
            </div>
            <p class="text-xs text-google-surface-500 font-medium">Operations & Monitoring Platform</p>
          </div>
        </div>

        <div class="flex items-center gap-2.5">
          <!-- Active User Badge -->
          <div class="flex items-center gap-2 rounded-full bg-google-surface-100 py-1 pl-3 pr-1.5 border border-google-surface-300/70 text-xs shadow-inner">
            <span class="font-bold text-google-surface-800 flex items-center gap-1.5">
              <span>{{ isIT ? '⚡' : (isSuperAdmin ? '👑' : (isAdmin ? '🛡️' : '🚚')) }}</span>
              <span class="text-google-blue-700 font-semibold">{{ currentUser.name || currentUser.username }}</span>
              <span
                class="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border shadow-2xs"
                :class="roleBadgeClass"
              >
                {{ currentUser.roleLabel || currentUser.role }}
              </span>
            </span>

            <!-- Role Switcher Button for Super Admin & IT -->
            <button
              v-if="canSwitchRole"
              type="button"
              class="rounded-full px-2.5 py-1 text-xs font-bold transition shadow-sm border flex items-center gap-1"
              :class="mode === 'admin' ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200' : 'bg-blue-100 text-blue-900 border-blue-300 hover:bg-blue-200'"
              @click="toggleMode"
              :title="mode === 'admin' ? 'Beralih ke Tampilan Driver' : 'Beralih ke Tampilan Admin'"
            >
              <span>🔄</span>
              <span>{{ mode === 'admin' ? 'Mode Driver' : 'Mode Admin' }}</span>
            </button>

            <!-- Tutorial Quick Button -->
            <button
              type="button"
              class="rounded-full bg-white hover:bg-google-surface-100 text-slate-700 px-2.5 py-1 text-xs font-bold border border-slate-200 transition shadow-sm flex items-center gap-1"
              @click="mode === 'admin' ? (adminView = 'tutorial') : (showDriverTutorial = !showDriverTutorial)"
              title="Buka Buku Panduan & Tutorial"
            >
              <span>📖</span>
              <span class="hidden sm:inline">Tutorial</span>
            </button>

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
      <!-- Breadcrumb Navigation -->
      <BreadcrumbNav :items="breadcrumbs" @navigate="handleBreadcrumbNav" />

      <!-- 404 View if invalid route -->
      <NotFoundView
        v-if="isNotFound"
        :path="currentPath"
        @navigate-home="goToHome"
        @navigate-driver="goToDriver"
      />

      <template v-else>
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

        <!-- ADMIN / SUPER ADMIN / IT SECTION -->
        <section v-if="mode === 'admin'">
          <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 v-if="adminView === 'create'" class="text-xl font-bold text-google-surface-800">Buat Surat Penugasan KPM Baru</h1>
              <h1 v-else-if="adminView === 'monitor'" class="text-xl font-bold text-google-surface-800">Pantau Status & Posisi KPM</h1>
              <h1 v-else-if="adminView === 'map'" class="text-xl font-bold text-google-surface-800">Live Radar Pelacakan Armada</h1>
              <h1 v-else-if="adminView === 'users'" class="text-xl font-bold text-google-surface-800">Kelola Pengguna Sistem</h1>
              <h1 v-else-if="adminView === 'tutorial'" class="text-xl font-bold text-google-surface-800">Buku Panduan & Tutorial Aplikasi</h1>
              <p class="text-xs text-google-surface-500 mt-0.5">Buat penugasan baru, pantau pergerakan KPM, dan kelola operasional.</p>
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
              <button
                v-if="canManageUsers"
                class="rounded-full px-4 py-2 text-xs font-bold transition-all duration-200"
                :class="adminView === 'users' ? 'bg-gradient-to-r from-google-blue-600 to-indigo-600 text-white shadow-sm' : 'text-google-surface-600 hover:text-google-surface-900'"
                @click="adminView = 'users'"
              >
                👥 Kelola Pengguna
              </button>
              <button
                class="rounded-full px-4 py-2 text-xs font-bold transition-all duration-200"
                :class="adminView === 'tutorial' ? 'bg-gradient-to-r from-google-blue-600 to-indigo-600 text-white shadow-sm' : 'text-google-surface-600 hover:text-google-surface-900'"
                @click="adminView = 'tutorial'"
              >
                📖 Tutorial
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
            :can-override-status="canOverrideStatus"
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

          <!-- USER MANAGEMENT PANEL (IT & Super Admin) -->
          <UserManagementPanel
            v-else-if="adminView === 'users' && canManageUsers"
          />

          <!-- TUTORIAL PANEL -->
          <TutorialPanel
            v-else-if="adminView === 'tutorial'"
          />

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
        <div v-else>
          <!-- Driver Tutorial View Toggle -->
          <div v-if="showDriverTutorial" class="space-y-4">
            <div class="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <button
                type="button"
                class="btn-primary !py-2 !px-4 !text-xs font-bold flex items-center gap-1.5"
                @click="showDriverTutorial = false"
              >
                <span>←</span>
                <span>Kembali ke Penugasan Driver</span>
              </button>
              <span class="text-xs text-slate-500 font-semibold">Mode Panduan Operasional Driver</span>
            </div>
            <TutorialPanel />
          </div>

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
        </div>
      </template>
    </main>
  </div>
</template>
