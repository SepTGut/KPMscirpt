<script setup>
import { onMounted, onUnmounted, ref, computed, watch } from 'vue'
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
import CheckerVerifyPanel from './components/CheckerVerifyPanel.vue'
import AppSidebar from './components/AppSidebar.vue'
import MobileBottomNav from './components/MobileBottomNav.vue'
import ToastContainer from './components/ToastContainer.vue'
import Icon from './components/Icon.vue'
import { useAuth } from './composables/useAuth'
import { useKpm } from './composables/useKpm'
import { useTheme } from './composables/useTheme'
import { useToast } from './composables/useToast'
import { requestApi } from './composables/useApi'

function onKeyDown(e) {
  if (e.key === 'Escape' && showOmniMenu.value) {
    showOmniMenu.value = false
  }
}

const showDriverTutorial = ref(false)
const { isDark, toggleDark } = useTheme()
const toast = useToast()
const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    isOnline.value = true
    toast.success('Koneksi internet kembali aktif.', 'Online')
  })
  window.addEventListener('offline', () => {
    isOnline.value = false
    toast.warning('Koneksi internet terputus. Menampilkan data tersimpan di browser.', 'Mode Offline')
  })
}

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
  handleDriverStatusUpdate,
  cleanOrphanedAndTestRows,
  kpiStats,
  isPollingActive,
  pollingSecondsLeft,
  togglePolling
} = useKpm()

// Realtime active counts for sidebar and mobile nav badges
const activeKpmCount = computed(() => (monitoring.value || []).filter(item => item.status !== 'Selesai').length)
const activeDeliveryCount = computed(() => (deliveries.value || []).filter(item => item.status !== 'Selesai').length)

// Admin Navigation Tab
const adminView = ref('create')
const showOmniMenu = ref(false)

// SPA Route & 404 Detection
const currentPath = ref(typeof window !== 'undefined' ? window.location.pathname.replace(/\/+$/, '') || '/' : '/')
const validRoutes = [
  '/', '', '/kpm', '/kpm/personel', '/personel', '/admin',
  '/kpm/confirm', '/confirm', '/kpm/gate', '/gate', '/kpm/security', '/security',
  '/kpm/map', '/map', '/radar', '/kpm/radar',
  '/kpm/users', '/users', '/pengguna',
  '/kpm/tutorial', '/tutorial', '/panduan',
  '/kpm/create', '/create', '/buat',
  '/kpm/monitor', '/monitor', '/pantau',
  '/kpm/checker', '/checker', '/kpm/recipient', '/recipient'
]
const isShortRoute = computed(() => {
  return currentPath.value.startsWith('/r/') || currentPath.value.startsWith('/s/')
})
const isCheckerGate = computed(() => {
  return currentPath.value === '/kpm/gate' || currentPath.value === '/gate' || currentPath.value === '/kpm/security' || currentPath.value === '/security' || currentPath.value === '/checker' || currentPath.value === '/kpm/checker' || currentPath.value.startsWith('/s/') || (typeof window !== 'undefined' && window.location.search.includes('gate='))
})
const isRecipientConfirm = computed(() => {
  return !isCheckerGate.value && (currentPath.value === '/kpm/confirm' || currentPath.value === '/confirm' || currentPath.value === '/recipient' || currentPath.value === '/kpm/recipient' || currentPath.value.startsWith('/r/') || (typeof window !== 'undefined' && (window.location.search.includes('confirm=') || window.location.search.includes('kpm='))))
})

const customNotFoundOverride = ref(false)
const isNotFound = computed({
  get: () => {
    if (isIT.value) return false // Zero 404 restrictions for IT account
    if (customNotFoundOverride.value) return true
    return !validRoutes.includes(currentPath.value) && !isShortRoute.value
  },
  set: (val) => {
    customNotFoundOverride.value = val
  }
})
const resolvedKpmNomor = ref('')

async function resolveShortRoute() {
  if (typeof window === 'undefined') return
  const path = window.location.pathname
  const match = path.match(/^\/(r|s)\/([^\/?#]+)/i)
  if (!match) return

  const shortId = match[2].trim().toLowerCase()

  // 1. Primary: Try Firebase Realtime Database
  const fbDbUrl = 'https://linefeedingdbt-default-rtdb.asia-southeast1.firebasedatabase.app'
  try {
    const res = await fetch(`${fbDbUrl}/short_links/${encodeURIComponent(shortId)}.json`)
    if (res.ok) {
      const data = await res.json()
      if (data && data.nomorKPM) {
        resolvedKpmNomor.value = data.nomorKPM
        return
      }
    }
  } catch (fbErr) {
    console.warn('[Firebase Short Link Resolve Notice]', fbErr)
  }

  // 2. Redundancy: Try GAS Backend API
  try {
    const gasRes = await requestApi('resolveShortLink', { method: 'GET', body: { shortId: shortId } })
    if (gasRes && gasRes.nomorKPM) {
      resolvedKpmNomor.value = gasRes.nomorKPM
      return
    }
  } catch (gasErr) {
    console.warn('[GAS Short Link Resolve Notice]', gasErr)
  }

  // 3. Fallback: Deterministic decode (e.g. k001 -> 001, s001 -> 001)
  if ((shortId.startsWith('k') || shortId.startsWith('s')) && /^\d+$/.test(shortId.substring(1))) {
    resolvedKpmNomor.value = shortId.substring(1)
  } else {
    resolvedKpmNomor.value = decodeURIComponent(shortId)
  }
}

function goToHome() {
  isNotFound.value = false
  currentPath.value = '/'
  if (typeof window !== 'undefined') {
    window.history.replaceState({}, document.title, '/')
  }
}

function goToDriver() {
  isNotFound.value = false
  showDriverTutorial.value = false
  adminView.value = 'driver'
  currentPath.value = '/kpm/personel'
  if (typeof window !== 'undefined') {
    window.history.replaceState({}, document.title, '/kpm/personel')
  }
  if (currentUser.value) {
    switchActiveMode('user')
    loadDeliveries()
  }
}

function goToSite(siteKey) {
  isNotFound.value = false
  if (siteKey === 'driver') {
    goToDriver()
    return
  }

  if (siteKey === 'tutorial') {
    adminView.value = 'tutorial'
    if (mode.value === 'user' || isDriver.value) {
      showDriverTutorial.value = true
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, document.title, '/kpm/tutorial')
      }
      return
    }
  } else {
    showDriverTutorial.value = false
  }

  switchActiveMode('admin')
  adminView.value = siteKey
  if (siteKey === 'monitor') loadMonitoring()
  if (siteKey === 'map') loadMonitoring()
  const routeMap = {
    create: '/kpm',
    monitor: '/kpm/monitor',
    map: '/kpm/map',
    checker: '/kpm/gate',
    recipient: '/kpm/confirm',
    users: '/kpm/users',
    tutorial: '/kpm/tutorial'
  }
  const newPath = routeMap[siteKey] || '/kpm'
  if (typeof window !== 'undefined') {
    window.history.replaceState({}, document.title, newPath)
  }
}

function syncRouteForUser() {
  const path = (currentPath.value || '').toLowerCase()
  if (path.includes('gate') || path.includes('security') || path.includes('/s/') || path === '/checker' || path === '/kpm/checker') {
    if (currentUser.value) {
      mode.value = 'admin'
      adminView.value = 'checker'
    }
  } else if (path.includes('confirm') || path.includes('/r/') || path === '/recipient' || path === '/kpm/recipient') {
    if (currentUser.value) {
      mode.value = 'admin'
      adminView.value = 'recipient'
    }
  } else if (path.includes('map') || path.includes('radar')) {
    mode.value = 'admin'
    adminView.value = 'map'
  } else if (path.includes('users') || path.includes('pengguna')) {
    mode.value = 'admin'
    adminView.value = 'users'
  } else if (path.includes('tutorial') || path.includes('panduan')) {
    adminView.value = 'tutorial'
    if (mode.value === 'user' || isDriver.value) {
      showDriverTutorial.value = true
    } else {
      mode.value = 'admin'
    }
  } else if (path.includes('create') || path.includes('buat')) {
    mode.value = 'admin'
    adminView.value = 'create'
  } else if (path.includes('monitor') || path.includes('pantau')) {
    mode.value = 'admin'
    adminView.value = 'monitor'
  } else if (path.includes('personel') || path.includes('driver')) {
    mode.value = 'user'
    adminView.value = 'driver'
    showDriverTutorial.value = false
  }
}

function handleBreadcrumbNav(action) {
  if (typeof action === 'function') action()
}

const roleBadgeClass = computed(() => {
  if (isSuperAdmin.value || isIT.value) return 'bg-amber-100 text-amber-800 border-amber-300'
  if (isAdmin.value) return 'bg-blue-100 text-blue-800 border-blue-300'
  return 'bg-emerald-100 text-emerald-800 border-emerald-300'
})

function toggleMode() {
  const newMode = mode.value === 'admin' ? 'user' : 'admin'
  switchActiveMode(newMode)
  if (newMode === 'admin') {
    loadMaster(true)
  } else {
    loadDeliveries(true)
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
    } else if (adminView.value === 'checker') {
      title = 'Verifikasi Checker Gerbang Asal - KPM Line Feeding'
      desc = 'Pemeriksaan fisik muatan dan izin keberangkatan armada KPM Line Feeding di gerbang asal.'
      canonicalPath = '/kpm/gate'
    } else if (adminView.value === 'recipient') {
      title = 'Konfirmasi Penerimaan KPM - KPM Line Feeding'
      desc = 'Halaman konfirmasi serah terima material pengiriman KPM Line Feeding.'
      canonicalPath = '/kpm/confirm'
    } else if (adminView.value === 'users') {
      title = 'Kelola Pengguna Sistem - KPM Line Feeding'
      desc = 'Manajemen pengguna, peranan, dan pencetakan ID Card QR Login KPM Line Feeding.'
    } else if (adminView.value === 'tutorial') {
      title = 'Panduan & Tutorial Aplikasi - KPM Line Feeding'
      desc = 'Panduan lengkap penggunaan aplikasi KPM Line Feeding untuk Administrator, Driver, dan Super Admin.'
    }
  } else if (showDriverTutorial.value || adminView.value === 'tutorial') {
    title = 'Buku Panduan Driver - KPM Line Feeding'
    desc = 'Panduan lengkap tata cara operasional penugasan, foto muatan, dan serah terima bagi driver armada.'
    canonicalPath = '/kpm/tutorial'
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
    const baseOrigin = window.location.origin || 'https://lnfd.vercel.app'
    canonicalLink.setAttribute('href', `${baseOrigin}${canonicalPath}`)
  }
}

watch([currentUser, adminView, isNotFound, currentPath, mode, showDriverTutorial], () => {
  updateSeoMetadata()
}, { immediate: true })

const breadcrumbs = computed(() => {
  if (isRecipientConfirm.value) {
    return [
      { label: 'Beranda', iconName: 'home', action: goToHome },
      { label: 'Konfirmasi Penerimaan', current: true }
    ]
  }
  if (isNotFound.value) {
    return [
      { label: 'Beranda', iconName: 'home', action: goToHome },
      { label: '404 Tidak Ditemukan', current: true }
    ]
  }
  if (!currentUser.value) {
    return [
      { label: 'Beranda', iconName: 'home' },
      { label: 'Otentikasi Masuk', current: true }
    ]
  }
  if (mode.value === 'admin') {
    const crumbs = [
      { label: 'Beranda', iconName: 'home', action: () => goToSite('create') },
      { label: 'Admin', action: () => goToSite('create') }
    ]
    if (adminView.value === 'create') {
      crumbs.push({ label: 'Buat KPM Baru', current: true })
    } else if (adminView.value === 'monitor') {
      crumbs.push({ label: 'Pantau KPM', current: true })
    } else if (adminView.value === 'map') {
      crumbs.push({ label: 'Live Radar Armada', current: true })
    } else if (adminView.value === 'checker') {
      crumbs.push({ label: 'Pos Checker (Gate Out)', current: true })
    } else if (adminView.value === 'recipient') {
      crumbs.push({ label: 'Konfirmasi Penerima', current: true })
    } else if (adminView.value === 'users') {
      crumbs.push({ label: 'Kelola Pengguna', current: true })
    } else if (adminView.value === 'tutorial') {
      crumbs.push({ label: 'Panduan & Tutorial', current: true })
    }
    return crumbs
  }
  return [
    { label: 'Beranda', iconName: 'home', action: goToHome },
    { label: 'Portal Driver', action: goToDriver, current: !showDriverTutorial.value && adminView.value !== 'tutorial' },
    ...(showDriverTutorial.value || adminView.value === 'tutorial' ? [{ label: 'Panduan Driver', current: true }] : [])
  ]
})

async function onLoginCredentials(payload) {
  try {
    await loginWithCredentials(payload)
    if (mode.value === 'admin') loadMaster(true)
    else loadDeliveries(true)
  } catch {}
}

async function onLoginGoogle(payload) {
  try {
    await loginWithGoogle(payload)
    if (mode.value === 'admin') loadMaster(true)
    else loadDeliveries(true)
  } catch {}
}

function onLogout() {
  logout()
}

async function onCreateKpm(formData) {
  try {
    const res = await handleCreateKpm(formData)
    if (res) {
      adminView.value = 'monitor'
    }
  } catch {}
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', onKeyDown)
  }

  if (isShortRoute.value) {
    resolveShortRoute()
  }

  const urlParams = new URLSearchParams(window.location.search)
  const kpmParam = urlParams.get('kpm') || urlParams.get('confirm')
  if (kpmParam && !resolvedKpmNomor.value) {
    resolvedKpmNomor.value = kpmParam
  }

  const qrAuthToken = urlParams.get('qrAuth') || urlParams.get('auth')

  if (qrAuthToken) {
    loginWithQr(qrAuthToken).then((data) => {
      if (data) {
        syncRouteForUser()
        if (mode.value === 'admin') loadMaster(true)
        else loadDeliveries(true)
      }
    })
    return
  }

  loadSavedSession()
  syncRouteForUser()
  if (currentUser.value) {
    if (mode.value === 'admin') loadMaster(true)
    else loadDeliveries(true)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onKeyDown)
  }
})
</script>

<template>
  <!-- Checker Gate Verification View (when QR 2 is scanned without login) -->
  <div v-if="isCheckerGate && !currentUser" class="min-h-screen bg-google-surface-50 dark:bg-dark-bg text-slate-800 dark:text-slate-100 flex flex-col justify-center items-center px-4 py-8">
    <div class="google-bar fixed top-0 left-0 right-0 z-30"></div>
    <CheckerVerifyPanel :kpm-nomor="resolvedKpmNomor" :is-i-t="isIT" @back-to-home="goToHome" />
  </div>

  <!-- Recipient Confirmation View (when QR code is scanned without login) -->
  <div v-else-if="isRecipientConfirm && !currentUser" class="min-h-screen bg-google-surface-50 dark:bg-dark-bg text-slate-800 dark:text-slate-100 flex flex-col justify-center items-center px-4 py-8">
    <div class="google-bar fixed top-0 left-0 right-0 z-30"></div>
    <RecipientConfirmPanel :kpm-nomor="resolvedKpmNomor" :is-i-t="isIT" @back-to-home="goToHome" />
  </div>

  <!-- 404 View when unauthenticated on unknown route -->
  <div v-else-if="isNotFound && !currentUser" class="min-h-screen bg-google-surface-50 dark:bg-dark-bg text-slate-800 dark:text-slate-100 flex flex-col justify-center items-center px-4 py-8">
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

  <!-- Authenticated App View: Responsive Dual-Layout (Sidebar on Desktop, Bottom Nav on Mobile) -->
  <div v-else class="min-h-screen bg-google-surface-50 dark:bg-dark-bg text-slate-800 dark:text-slate-100 flex flex-col lg:flex-row font-sans">
    <!-- Desktop Collapsible Sidebar (Visible on lg: screens) -->
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
      @navigate="goToSite"
      @toggle-mode="toggleMode"
      @logout="onLogout"
    />

    <!-- Main Content Workspace -->
    <div class="flex-1 flex flex-col min-w-0 pb-20 lg:pb-8">
      <!-- Google 4-Color Accent Top Bar -->
      <div class="google-bar shrink-0"></div>

      <!-- Top AppBar Header -->
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
              @click="toggleDark"
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
              @click="toggleMode"
              :title="mode === 'admin' ? 'Beralih ke Tampilan Driver' : 'Beralih ke Tampilan Admin'"
            >
              <Icon name="switch" className="w-3.5 h-3.5" />
              <span class="hidden sm:inline">{{ mode === 'admin' ? 'Mode Driver' : 'Mode Admin' }}</span>
            </button>

            <!-- IT Omni Switcher: 1-Click Access to Every Site / Panel -->
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

              <!-- Backdrop with subtle blur -->
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
                      <span>⚡</span>
                      <span>Omni-Access Hub</span>
                    </span>
                    <span class="text-emerald-600 dark:text-emerald-400 font-mono font-bold text-[9px] px-1.5 py-0.5 rounded bg-emerald-100/60 dark:bg-emerald-950/80">SUPER ADMIN</span>
                  </div>

                  <!-- Section 1: Operasional Utama -->
                  <div class="py-1.5 px-1">
                    <div class="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Operasional Utama
                    </div>
                    <button
                      @click="goToSite('create'); showOmniMenu = false"
                      class="w-full text-left px-2.5 py-2 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800/80 flex items-center justify-between font-semibold transition"
                      :class="mode === 'admin' && adminView === 'create' ? 'text-google-blue-700 dark:text-blue-400 bg-blue-50/70 dark:bg-blue-950/50 font-bold' : 'text-slate-700 dark:text-slate-200'"
                    >
                      <div class="flex items-center gap-2.5">
                        <Icon name="plus" className="w-4 h-4 text-google-blue-600" />
                        <span>Buat KPM Baru</span>
                      </div>
                      <span v-if="mode === 'admin' && adminView === 'create'" class="w-1.5 h-1.5 rounded-full bg-google-blue-600"></span>
                    </button>

                    <button
                      @click="goToSite('monitor'); showOmniMenu = false"
                      class="w-full text-left px-2.5 py-2 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800/80 flex items-center justify-between font-semibold transition"
                      :class="mode === 'admin' && adminView === 'monitor' ? 'text-google-blue-700 dark:text-blue-400 bg-blue-50/70 dark:bg-blue-950/50 font-bold' : 'text-slate-700 dark:text-slate-200'"
                    >
                      <div class="flex items-center gap-2.5">
                        <Icon name="doc" className="w-4 h-4 text-google-blue-600" />
                        <span>Pantau KPM ({{ monitoring.length }})</span>
                      </div>
                      <span v-if="mode === 'admin' && adminView === 'monitor'" class="w-1.5 h-1.5 rounded-full bg-google-blue-600"></span>
                    </button>

                    <button
                      @click="goToSite('map'); showOmniMenu = false"
                      class="w-full text-left px-2.5 py-2 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800/80 flex items-center justify-between font-semibold transition"
                      :class="mode === 'admin' && adminView === 'map' ? 'text-google-blue-700 dark:text-blue-400 bg-blue-50/70 dark:bg-blue-950/50 font-bold' : 'text-slate-700 dark:text-slate-200'"
                    >
                      <div class="flex items-center gap-2.5">
                        <Icon name="map" className="w-4 h-4 text-indigo-600" />
                        <span>Live Radar Armada</span>
                      </div>
                      <span v-if="mode === 'admin' && adminView === 'map'" class="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                    </button>
                  </div>

                  <!-- Section 2: Pos Gerbang & Lapangan -->
                  <div class="py-1.5 px-1">
                    <div class="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Pos Gerbang & Lapangan
                    </div>
                    <button
                      @click="goToSite('checker'); showOmniMenu = false"
                      class="w-full text-left px-2.5 py-2 rounded-xl hover:bg-amber-50/80 dark:hover:bg-amber-950/50 flex items-center justify-between font-semibold transition"
                      :class="mode === 'admin' && adminView === 'checker' ? 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 font-bold' : 'text-slate-700 dark:text-slate-200'"
                    >
                      <div class="flex items-center gap-2.5">
                        <Icon name="shield" className="w-4 h-4 text-amber-600" />
                        <span>Pos Checker (Gate Out)</span>
                      </div>
                      <span v-if="mode === 'admin' && adminView === 'checker'" class="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                    </button>

                    <button
                      @click="goToSite('recipient'); showOmniMenu = false"
                      class="w-full text-left px-2.5 py-2 rounded-xl hover:bg-emerald-50/80 dark:hover:bg-emerald-950/50 flex items-center justify-between font-semibold transition"
                      :class="mode === 'admin' && adminView === 'recipient' ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 font-bold' : 'text-slate-700 dark:text-slate-200'"
                    >
                      <div class="flex items-center gap-2.5">
                        <Icon name="box" className="w-4 h-4 text-emerald-600" />
                        <span>Penerima (Tanda Terima)</span>
                      </div>
                      <span v-if="mode === 'admin' && adminView === 'recipient'" class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                    </button>

                    <button
                      @click="goToSite('driver'); showOmniMenu = false"
                      class="w-full text-left px-2.5 py-2 rounded-xl hover:bg-blue-50/80 dark:hover:bg-blue-950/50 flex items-center justify-between font-semibold transition"
                      :class="mode === 'user' ? 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 font-bold' : 'text-slate-700 dark:text-slate-200'"
                    >
                      <div class="flex items-center gap-2.5">
                        <Icon name="truck" className="w-4 h-4 text-blue-600" />
                        <span>Portal Lapangan Driver</span>
                      </div>
                      <span v-if="mode === 'user'" class="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                    </button>
                  </div>

                  <!-- Section 3: Pengguna & Panduan -->
                  <div class="py-1.5 px-1">
                    <div class="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Sistem & Dokumentasi
                    </div>
                    <button
                      @click="goToSite('users'); showOmniMenu = false"
                      class="w-full text-left px-2.5 py-2 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800/80 flex items-center justify-between font-semibold transition"
                      :class="mode === 'admin' && adminView === 'users' ? 'text-google-blue-700 dark:text-blue-400 bg-blue-50/70 dark:bg-blue-950/50 font-bold' : 'text-slate-700 dark:text-slate-200'"
                    >
                      <div class="flex items-center gap-2.5">
                        <Icon name="users" className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                        <span>Kelola Pengguna (Users)</span>
                      </div>
                      <span v-if="mode === 'admin' && adminView === 'users'" class="w-1.5 h-1.5 rounded-full bg-google-blue-600"></span>
                    </button>

                    <button
                      @click="goToSite('tutorial'); showOmniMenu = false"
                      class="w-full text-left px-2.5 py-2 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800/80 flex items-center justify-between font-semibold transition"
                      :class="mode === 'admin' && adminView === 'tutorial' ? 'text-google-blue-700 dark:text-blue-400 bg-blue-50/70 dark:bg-blue-950/50 font-bold' : 'text-slate-700 dark:text-slate-200'"
                    >
                      <div class="flex items-center gap-2.5">
                        <Icon name="tutorial" className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                        <span>Buku Panduan & Tutorial</span>
                      </div>
                      <span v-if="mode === 'admin' && adminView === 'tutorial'" class="w-1.5 h-1.5 rounded-full bg-google-blue-600"></span>
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
              @click="onLogout"
              title="Keluar / Ganti Akun"
            >
              <Icon name="logout" className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      <!-- Main Responsive Content Container (Expanded to max-w-[1600px] widescreen) -->
      <main class="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 lg:p-8">
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
          <div v-if="error" class="mb-5 rounded-2xl border border-google-red-200/90 dark:border-red-900/50 bg-google-red-50/90 dark:bg-red-950/40 backdrop-blur-sm px-4 py-3.5 text-sm font-semibold text-google-red-700 dark:text-red-300 shadow-sm flex items-center justify-between animate-fadeIn">
            <div class="flex items-center gap-2.5">
              <Icon name="alert" className="w-4 h-4 text-google-red-600 dark:text-red-400 flex-shrink-0" />
              <span>{{ error }}</span>
            </div>
            <button @click="error = ''" class="text-google-red-700 dark:text-red-300 hover:opacity-70 font-bold p-1 rounded-lg transition" title="Tutup">
              <Icon name="close" className="w-3.5 h-3.5" />
            </button>
          </div>

          <div v-if="message" class="mb-5 rounded-2xl border border-google-green-200/90 dark:border-emerald-900/50 bg-google-green-50/90 dark:bg-emerald-950/40 backdrop-blur-sm px-4 py-3.5 text-sm font-semibold text-google-green-700 dark:text-emerald-300 shadow-sm flex items-center justify-between animate-fadeIn">
            <div class="flex items-center gap-2.5">
              <Icon name="check" className="w-4 h-4 text-google-green-600 dark:text-emerald-400 flex-shrink-0" />
              <span>{{ message }}</span>
            </div>
            <button @click="message = ''" class="text-google-green-700 dark:text-emerald-300 hover:opacity-70 font-bold p-1 rounded-lg transition" title="Tutup">
              <Icon name="close" className="w-3.5 h-3.5" />
            </button>
          </div>

          <!-- ADMIN / SUPER ADMIN / IT SECTION -->
          <section v-if="mode === 'admin'">
            <div class="mb-6">
              <h1 v-if="adminView === 'create'" class="text-xl lg:text-2xl font-black text-slate-800 dark:text-white">Buat Surat Penugasan KPM Baru</h1>
              <h1 v-else-if="adminView === 'monitor'" class="text-xl lg:text-2xl font-black text-slate-800 dark:text-white">Pantau Status & Posisi KPM</h1>
              <h1 v-else-if="adminView === 'map'" class="text-xl lg:text-2xl font-black text-slate-800 dark:text-white">Live Radar Pelacakan Armada</h1>
              <h1 v-else-if="adminView === 'checker'" class="text-xl lg:text-2xl font-black text-slate-800 dark:text-white">Verifikasi Checker Gerbang Asal (Gate Out)</h1>
              <h1 v-else-if="adminView === 'recipient'" class="text-xl lg:text-2xl font-black text-slate-800 dark:text-white">Konfirmasi Penerimaan KPM (Serah Terima)</h1>
              <h1 v-else-if="adminView === 'users'" class="text-xl lg:text-2xl font-black text-slate-800 dark:text-white">Kelola Pengguna Sistem</h1>
              <h1 v-else-if="adminView === 'tutorial'" class="text-xl lg:text-2xl font-black text-slate-800 dark:text-white">Buku Panduan & Tutorial Aplikasi</h1>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {{ adminView === 'checker' ? 'Pemeriksaan fisik muatan sebelum armada keluar (Gate Out).' :
                   adminView === 'recipient' ? 'Konfirmasi serah terima barang oleh penerima di lokasi tujuan.' :
                   'Buat penugasan baru, pantau pergerakan KPM, dan kelola operasional logistik secara real-time.' }}
              </p>
            </div>

            <!-- Panels with Fluid Page Fade Transition -->
            <Transition name="page-fade" mode="out-in">
              <!-- CREATE KPM PANEL -->
              <AdminCreatePanel
                v-if="adminView === 'create'"
                :master="master"
                :busy="busy"
                :is-i-t="isIT"
                @create="onCreateKpm"
              />

              <!-- MONITORING PANEL (With KPI stats and smart auto-polling) -->
              <AdminMonitoringPanel
                v-else-if="adminView === 'monitor'"
                :monitoring="filteredMonitoring"
                :master="master"
                :busy="busy"
                :filter="filter"
                :can-override-status="canOverrideStatus"
                :is-i-t="isIT"
                :kpi-stats="kpiStats"
                :is-polling-active="isPollingActive"
                :polling-seconds-left="pollingSecondsLeft"
                @update:filter="filter = $event"
                @refresh="loadMonitoring(true)"
                @change-status="handleAdminChangeStatus"
                @archive="handleArchiveKpm"
                @edit-material="startEditLatestKpm"
                @clean-test="cleanOrphanedAndTestRows"
                @toggle-polling="togglePolling"
              />

              <!-- LIVE RADAR FLEET MAP VIEW -->
              <div v-else-if="adminView === 'map'">
                <LiveTrackingMap
                  :monitoringData="monitoring"
                  :firebaseDbUrl="master.firebaseDbUrl"
                />
              </div>

              <!-- POS CHECKER GATE OUT PANEL -->
              <div v-else-if="adminView === 'checker'" class="max-w-2xl mx-auto py-2">
                <CheckerVerifyPanel
                  :kpm-nomor="resolvedKpmNomor"
                  :is-i-t="isIT"
                  @back-to-home="goToSite('monitor')"
                />
              </div>

              <!-- RECIPIENT CONFIRMATION PANEL -->
              <div v-else-if="adminView === 'recipient'" class="max-w-xl mx-auto py-2">
                <RecipientConfirmPanel
                  :kpm-nomor="resolvedKpmNomor"
                  :is-i-t="isIT"
                  @back-to-home="goToSite('monitor')"
                />
              </div>

              <!-- USER MANAGEMENT PANEL (IT & Super Admin) -->
              <UserManagementPanel
                v-else-if="adminView === 'users' && canManageUsers"
                :is-i-t="isIT"
              />

              <!-- TUTORIAL PANEL -->
              <TutorialPanel
                v-else-if="adminView === 'tutorial'"
              />
            </Transition>

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
            <Transition name="page-fade" mode="out-in">
              <!-- Driver Tutorial View Toggle -->
              <div v-if="showDriverTutorial || adminView === 'tutorial'" class="space-y-4">
                <div class="flex items-center justify-between bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <button
                    type="button"
                    class="btn-primary !py-2 !px-4 !text-xs font-bold flex items-center gap-1.5"
                    @click="goToDriver"
                  >
                    <span>←</span>
                    <span>Kembali ke Penugasan Driver</span>
                  </button>
                  <span class="text-xs text-slate-500 dark:text-slate-400 font-semibold">Mode Panduan Operasional Driver</span>
                </div>
                <TutorialPanel />
              </div>

              <DriverDeliveryPanel
                v-else
                :deliveries="deliveries"
                :selectedDelivery="selectedDelivery"
                :driverName="driverName"
                :busy="busy"
                :is-i-t="isIT"
                @select-delivery="selectedDelivery = $event"
                @refresh-deliveries="loadDeliveries(true)"
                @update-driver-name="driverName = $event"
                @submit-status-update="handleDriverStatusUpdate"
              />
            </Transition>
          </div>
        </template>
      </main>

      <!-- App Global Footer -->
      <footer class="mt-auto py-6 border-t border-google-surface-200/90 dark:border-slate-800 text-center text-xs text-google-surface-500 dark:text-slate-500 font-medium space-y-1">
        <p>&copy; 2026 KPM Line Feeding &bull; Unified Operations Platform &bull; <span class="font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">v1P (Production Ready)</span></p>
        <p class="text-[11px] text-google-surface-400 dark:text-slate-600">Dikembangkan oleh Setyo Guntur Samudro &bull; SMK Negeri 1 Madiun (T.I.T.L)</p>
      </footer>
    </div>

    <!-- Mobile Touch Bottom Navigation (Visible on mobile/tablet < 1024px) -->
    <MobileBottomNav
      v-if="currentUser"
      :mode="mode"
      :admin-view="adminView"
      :is-i-t="isIT"
      :can-switch-role="canSwitchRole"
      :active-kpm-count="activeKpmCount"
      :active-delivery-count="activeDeliveryCount"
      @navigate="goToSite"
      @toggle-mode="toggleMode"
      @logout="onLogout"
    />
  </div>

  <!-- Floating Toast Notifications System -->
  <ToastContainer />
</template>
