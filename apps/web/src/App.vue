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
import CheckerVerifyPanel from './components/CheckerVerifyPanel.vue'
import { useAuth } from './composables/useAuth'
import { useKpm } from './composables/useKpm'
import { requestApi } from './composables/useApi'

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
  handleDriverStatusUpdate,
  cleanOrphanedAndTestRows
} = useKpm()

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
    switchActiveMode('user')
    loadDeliveries()
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, document.title, '/kpm/personel')
    }
    return
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
    mode.value = 'admin'
    adminView.value = 'tutorial'
  } else if (path.includes('create') || path.includes('buat')) {
    mode.value = 'admin'
    adminView.value = 'create'
  } else if (path.includes('monitor') || path.includes('pantau')) {
    mode.value = 'admin'
    adminView.value = 'monitor'
  } else if (path.includes('personel') || path.includes('driver')) {
    mode.value = 'user'
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

watch([currentUser, adminView, isNotFound, currentPath, mode], () => {
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
      { label: 'Beranda', iconName: 'home', action: () => { adminView.value = 'create' } },
      { label: 'Admin', action: () => { adminView.value = 'create' } }
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
    { label: 'Portal Driver', current: true }
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

onMounted(() => {
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
</script>

<template>
  <!-- Checker Gate Verification View (when QR 2 is scanned without login) -->
  <div v-if="isCheckerGate && !currentUser" class="min-h-screen bg-google-surface-50 flex flex-col justify-center items-center px-4 py-8">
    <div class="google-bar fixed top-0 left-0 right-0 z-30"></div>
    <CheckerVerifyPanel :kpm-nomor="resolvedKpmNomor" :is-i-t="isIT" @back-to-home="goToHome" />
  </div>

  <!-- Recipient Confirmation View (when QR code is scanned without login) -->
  <div v-else-if="isRecipientConfirm && !currentUser" class="min-h-screen bg-google-surface-50 flex flex-col justify-center items-center px-4 py-8">
    <div class="google-bar fixed top-0 left-0 right-0 z-30"></div>
    <RecipientConfirmPanel :kpm-nomor="resolvedKpmNomor" :is-i-t="isIT" @back-to-home="goToHome" />
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
              <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shadow-2xs">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                v1P • PROD
              </span>
            </div>
            <p class="text-xs text-google-surface-500 font-medium">Operations &amp; Monitoring Platform &bull; Production Ready</p>
          </div>
        </div>

        <div class="flex items-center gap-2.5">
          <!-- Active User Badge -->
          <div class="flex items-center gap-2 rounded-full bg-google-surface-100 py-1 pl-3 pr-1.5 border border-google-surface-300/70 text-xs shadow-inner">
            <span class="font-bold text-google-surface-800 flex items-center gap-1.5">
              <Icon :name="(isSuperAdmin || isIT) ? 'crown' : (isAdmin ? 'shield' : 'truck')" className="w-3.5 h-3.5 text-google-surface-700" />
              <span class="text-google-blue-700 font-semibold">{{ currentUser.name || currentUser.username }}</span>
              <span
                class="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border shadow-2xs"
                :class="roleBadgeClass"
              >
                {{ isIT ? 'Super Admin' : (currentUser.roleLabel || currentUser.role) }}
              </span>
            </span>

            <!-- Role Switcher Button for Super Admin -->
            <button
              v-if="canSwitchRole"
              type="button"
              class="rounded-full px-2.5 py-1 text-xs font-bold transition shadow-sm border flex items-center gap-1.5 focus-visible:outline-none"
              :class="mode === 'admin' ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200' : 'bg-blue-100 text-blue-900 border-blue-300 hover:bg-blue-200'"
              @click="toggleMode"
              :title="mode === 'admin' ? 'Beralih ke Tampilan Driver' : 'Beralih ke Tampilan Admin'"
            >
              <Icon name="switch" className="w-3 h-3" />
              <span>{{ mode === 'admin' ? 'Mode Driver' : 'Mode Admin' }}</span>
            </button>

            <!-- IT Omni Switcher: 1-Click Access to Every Site / Panel -->
            <div v-if="isIT" class="relative">
              <button
                type="button"
                class="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-2.5 py-1 text-xs font-extrabold shadow-sm flex items-center gap-1.5 transition active:scale-95 focus-visible:outline-none"
                @click="showOmniMenu = !showOmniMenu"
                title="Akses Semua Situs & Halaman KPM (Super Admin IT)"
              >
                <span>⚡</span>
                <span class="hidden sm:inline">Akses Situs IT</span>
                <span class="text-[9px]">▼</span>
              </button>

              <!-- Backdrop -->
              <div v-if="showOmniMenu" class="fixed inset-0 z-40" @click="showOmniMenu = false"></div>

              <!-- Dropdown Menu -->
              <div
                v-if="showOmniMenu"
                class="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 py-1.5 z-50 animate-fadeIn text-xs"
              >
                <div class="px-3 py-1.5 border-b border-slate-100 text-[10px] font-extrabold uppercase text-amber-800 bg-amber-50/70 flex items-center justify-between">
                  <span>Omni-Access Navigation</span>
                  <span class="text-emerald-600 font-mono font-bold">ALL SITES</span>
                </div>

                <div class="py-1">
                  <button
                    @click="goToSite('create'); showOmniMenu = false"
                    class="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 font-semibold transition"
                    :class="mode === 'admin' && adminView === 'create' ? 'text-google-blue-700 bg-blue-50/60 font-bold' : 'text-slate-700'"
                  >
                    <Icon name="plus" className="w-3.5 h-3.5 text-google-blue-600" />
                    <span>Buat KPM Baru (Admin)</span>
                  </button>

                  <button
                    @click="goToSite('monitor'); showOmniMenu = false"
                    class="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 font-semibold transition"
                    :class="mode === 'admin' && adminView === 'monitor' ? 'text-google-blue-700 bg-blue-50/60 font-bold' : 'text-slate-700'"
                  >
                    <Icon name="doc" className="w-3.5 h-3.5 text-google-blue-600" />
                    <span>Pantau KPM Monitoring</span>
                  </button>

                  <button
                    @click="goToSite('map'); showOmniMenu = false"
                    class="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 font-semibold transition"
                    :class="mode === 'admin' && adminView === 'map' ? 'text-google-blue-700 bg-blue-50/60 font-bold' : 'text-slate-700'"
                  >
                    <Icon name="map" className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Live Radar Pelacakan Armada</span>
                  </button>

                  <button
                    @click="goToSite('checker'); showOmniMenu = false"
                    class="w-full text-left px-3 py-2 hover:bg-amber-50/60 flex items-center gap-2 font-semibold transition"
                    :class="mode === 'admin' && adminView === 'checker' ? 'text-amber-700 bg-amber-50 font-bold' : 'text-slate-700'"
                  >
                    <Icon name="shield" className="w-3.5 h-3.5 text-amber-600" />
                    <span>Pos Checker (Gate Out)</span>
                  </button>

                  <button
                    @click="goToSite('recipient'); showOmniMenu = false"
                    class="w-full text-left px-3 py-2 hover:bg-emerald-50/60 flex items-center gap-2 font-semibold transition"
                    :class="mode === 'admin' && adminView === 'recipient' ? 'text-emerald-700 bg-emerald-50 font-bold' : 'text-slate-700'"
                  >
                    <Icon name="box" className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Penerima (Tanda Terima)</span>
                  </button>

                  <button
                    @click="goToSite('driver'); showOmniMenu = false"
                    class="w-full text-left px-3 py-2 hover:bg-blue-50/60 flex items-center gap-2 font-semibold transition"
                    :class="mode === 'user' ? 'text-blue-700 bg-blue-50 font-bold' : 'text-slate-700'"
                  >
                    <Icon name="truck" className="w-3.5 h-3.5 text-blue-600" />
                    <span>Portal Lapangan Driver</span>
                  </button>

                  <button
                    @click="goToSite('users'); showOmniMenu = false"
                    class="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 font-semibold transition"
                    :class="mode === 'admin' && adminView === 'users' ? 'text-google-blue-700 bg-blue-50/60 font-bold' : 'text-slate-700'"
                  >
                    <Icon name="users" className="w-3.5 h-3.5 text-slate-600" />
                    <span>Kelola Pengguna (Users)</span>
                  </button>

                  <button
                    @click="goToSite('tutorial'); showOmniMenu = false"
                    class="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 font-semibold transition"
                    :class="mode === 'admin' && adminView === 'tutorial' ? 'text-google-blue-700 bg-blue-50/60 font-bold' : 'text-slate-700'"
                  >
                    <Icon name="tutorial" className="w-3.5 h-3.5 text-slate-600" />
                    <span>Buku Panduan & Tutorial</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Tutorial Quick Button -->
            <button
              type="button"
              class="rounded-full bg-white hover:bg-google-surface-100 text-slate-700 px-2.5 py-1 text-xs font-bold border border-slate-200 transition shadow-sm flex items-center gap-1.5 focus-visible:outline-none"
              @click="mode === 'admin' ? (adminView = 'tutorial') : (showDriverTutorial = !showDriverTutorial)"
              title="Buka Buku Panduan & Tutorial"
            >
              <Icon name="tutorial" className="w-3.5 h-3.5 text-slate-600" />
              <span class="hidden sm:inline">Tutorial</span>
            </button>

            <!-- Logout Button -->
            <button
              type="button"
              class="rounded-full bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 px-2.5 py-1 text-xs font-bold border border-slate-200 transition shadow-sm flex items-center gap-1 focus-visible:outline-none"
              @click="onLogout"
              title="Keluar / Ganti Akun"
            >
              <span>Keluar</span>
              <Icon name="logout" className="w-3 h-3" />
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
          <div class="flex items-center gap-2.5">
            <Icon name="alert" className="w-4 h-4 text-google-red-600 flex-shrink-0" />
            <span>{{ error }}</span>
          </div>
          <button @click="error = ''" class="text-google-red-700 hover:opacity-70 font-bold p-1">
            <Icon name="close" className="w-3.5 h-3.5" />
          </button>
        </div>

        <div v-if="message" class="mb-5 rounded-2xl border border-google-green-200 bg-google-green-50 px-4 py-3.5 text-sm font-semibold text-google-green-700 shadow-sm flex items-center justify-between animate-fadeIn">
          <div class="flex items-center gap-2.5">
            <Icon name="check" className="w-4 h-4 text-google-green-600 flex-shrink-0" />
            <span>{{ message }}</span>
          </div>
          <button @click="message = ''" class="text-google-green-700 hover:opacity-70 font-bold p-1">
            <Icon name="close" className="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- ADMIN / SUPER ADMIN / IT SECTION -->
        <section v-if="mode === 'admin'">
          <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 v-if="adminView === 'create'" class="text-xl font-bold text-google-surface-800">Buat Surat Penugasan KPM Baru</h1>
              <h1 v-else-if="adminView === 'monitor'" class="text-xl font-bold text-google-surface-800">Pantau Status & Posisi KPM</h1>
              <h1 v-else-if="adminView === 'map'" class="text-xl font-bold text-google-surface-800">Live Radar Pelacakan Armada</h1>
              <h1 v-else-if="adminView === 'checker'" class="text-xl font-bold text-google-surface-800">Verifikasi Checker Gerbang Asal (Gate Out)</h1>
              <h1 v-else-if="adminView === 'recipient'" class="text-xl font-bold text-google-surface-800">Konfirmasi Penerimaan KPM (Serah Terima)</h1>
              <h1 v-else-if="adminView === 'users'" class="text-xl font-bold text-google-surface-800">Kelola Pengguna Sistem</h1>
              <h1 v-else-if="adminView === 'tutorial'" class="text-xl font-bold text-google-surface-800">Buku Panduan & Tutorial Aplikasi</h1>
              <p class="text-xs text-google-surface-500 mt-0.5">
                {{ adminView === 'checker' ? 'Pemeriksaan fisik muatan sebelum armada keluar (Gate Out).' :
                   adminView === 'recipient' ? 'Konfirmasi serah terima barang oleh penerima di lokasi tujuan.' :
                   'Buat penugasan baru, pantau pergerakan KPM, dan kelola operasional.' }}
              </p>
            </div>

            <!-- M3 Segmented Navigation Tabs -->
            <div class="flex bg-google-surface-100 p-1 rounded-full border border-google-surface-300/70 shadow-sm flex-wrap gap-1">
              <button
                class="rounded-full px-4 py-2 text-xs font-bold transition-all duration-200 inline-flex items-center gap-1.5 focus-visible:outline-none"
                :class="adminView === 'create' ? 'bg-gradient-to-r from-google-blue-600 to-indigo-600 text-white shadow-sm' : 'text-google-surface-600 hover:text-google-surface-900'"
                @click="adminView = 'create'"
              >
                <Icon name="plus" className="w-3.5 h-3.5" />
                <span>Buat KPM Baru</span>
              </button>
              <button
                class="rounded-full px-4 py-2 text-xs font-bold transition-all duration-200 inline-flex items-center gap-1.5 focus-visible:outline-none"
                :class="adminView === 'monitor' ? 'bg-gradient-to-r from-google-blue-600 to-indigo-600 text-white shadow-sm' : 'text-google-surface-600 hover:text-google-surface-900'"
                @click="adminView = 'monitor'; loadMonitoring()"
              >
                <Icon name="doc" className="w-3.5 h-3.5" />
                <span>Pantau KPM ({{ monitoring.length }})</span>
              </button>
              <button
                class="rounded-full px-4 py-2 text-xs font-bold transition-all duration-200 inline-flex items-center gap-1.5 focus-visible:outline-none"
                :class="adminView === 'map' ? 'bg-gradient-to-r from-google-blue-600 to-indigo-600 text-white shadow-sm' : 'text-google-surface-600 hover:text-google-surface-900'"
                @click="adminView = 'map'; loadMonitoring()"
              >
                <Icon name="map" className="w-3.5 h-3.5" />
                <span>Live Radar</span>
              </button>

              <!-- Pos Checker (Gate Out) - Accessible by IT -->
              <button
                v-if="isIT"
                class="rounded-full px-4 py-2 text-xs font-bold transition-all duration-200 inline-flex items-center gap-1.5 focus-visible:outline-none"
                :class="adminView === 'checker' ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-sm' : 'text-amber-800 hover:text-amber-950 hover:bg-amber-100/60'"
                @click="adminView = 'checker'"
              >
                <Icon name="shield" className="w-3.5 h-3.5" />
                <span>Pos Checker</span>
              </button>

              <!-- Penerima (Tanda Terima) - Accessible by IT -->
              <button
                v-if="isIT"
                class="rounded-full px-4 py-2 text-xs font-bold transition-all duration-200 inline-flex items-center gap-1.5 focus-visible:outline-none"
                :class="adminView === 'recipient' ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm' : 'text-emerald-800 hover:text-emerald-950 hover:bg-emerald-100/60'"
                @click="adminView = 'recipient'"
              >
                <Icon name="box" className="w-3.5 h-3.5" />
                <span>Penerima</span>
              </button>

              <button
                v-if="canManageUsers"
                class="rounded-full px-4 py-2 text-xs font-bold transition-all duration-200 inline-flex items-center gap-1.5 focus-visible:outline-none"
                :class="adminView === 'users' ? 'bg-gradient-to-r from-google-blue-600 to-indigo-600 text-white shadow-sm' : 'text-google-surface-600 hover:text-google-surface-900'"
                @click="adminView = 'users'"
              >
                <Icon name="users" className="w-3.5 h-3.5" />
                <span>Kelola Pengguna</span>
              </button>
              <button
                class="rounded-full px-4 py-2 text-xs font-bold transition-all duration-200 inline-flex items-center gap-1.5 focus-visible:outline-none"
                :class="adminView === 'tutorial' ? 'bg-gradient-to-r from-google-blue-600 to-indigo-600 text-white shadow-sm' : 'text-google-surface-600 hover:text-google-surface-900'"
                @click="adminView = 'tutorial'"
              >
                <Icon name="tutorial" className="w-3.5 h-3.5" />
                <span>Tutorial</span>
              </button>
            </div>
          </div>

          <!-- CREATE KPM PANEL -->
          <AdminCreatePanel
            v-if="adminView === 'create'"
            :master="master"
            :busy="busy"
            :is-i-t="isIT"
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
            :is-i-t="isIT"
            @update:filter="filter = $event"
            @refresh="loadMonitoring(true)"
            @change-status="handleAdminChangeStatus"
            @archive="handleArchiveKpm"
            @edit-material="startEditLatestKpm"
            @clean-test="cleanOrphanedAndTestRows"
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
              @back-to-home="adminView = 'monitor'"
            />
          </div>

          <!-- RECIPIENT CONFIRMATION PANEL -->
          <div v-else-if="adminView === 'recipient'" class="max-w-xl mx-auto py-2">
            <RecipientConfirmPanel
              :kpm-nomor="resolvedKpmNomor"
              :is-i-t="isIT"
              @back-to-home="adminView = 'monitor'"
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
            :is-i-t="isIT"
            @select-delivery="selectedDelivery = $event"
            @refresh-deliveries="loadDeliveries(true)"
            @update-driver-name="driverName = $event"
            @submit-status-update="handleDriverStatusUpdate"
          />
        </div>
      </template>
    </main>

    <!-- App Global Footer -->
    <footer class="mt-12 py-6 border-t border-google-surface-200/90 text-center text-xs text-google-surface-500 font-medium space-y-1">
      <p>&copy; 2026 KPM Line Feeding &bull; Unified Operations Platform &bull; <span class="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">v1P (Production Ready)</span></p>
      <p class="text-[11px] text-google-surface-400">Dikembangkan oleh Setyo Guntur Samudro &bull; SMK Negeri 1 Madiun (T.I.T.L)</p>
    </footer>
  </div>
</template>
