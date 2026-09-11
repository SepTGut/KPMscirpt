import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

/**
 * KPM Web App Router
 * Lazy-loaded routes with auth guards and backward-compatible URL aliases.
 */

// Lazy-loaded view/component imports
const LoginScreen = () => import('../components/LoginScreen.vue')
const AdminCreatePanel = () => import('../components/AdminCreatePanel.vue')
const AdminMonitoringPanel = () => import('../components/AdminMonitoringPanel.vue')
const LiveTrackingMap = () => import('../components/LiveTrackingMap.vue')
const DriverDeliveryPanel = () => import('../components/DriverDeliveryPanel.vue')
const UserManagementPanel = () => import('../components/UserManagementPanel.vue')
const TutorialPanel = () => import('../components/TutorialPanel.vue')
const RecipientConfirmPanel = () => import('../components/RecipientConfirmPanel.vue')
const CheckerVerifyPanel = () => import('../components/CheckerVerifyPanel.vue')
const NotFoundView = () => import('../components/NotFoundView.vue')

const routes = [
  // ─── Public Routes (no auth required) ─────────────────────
  {
    path: '/login',
    name: 'login',
    component: LoginScreen,
    meta: { requiresAuth: false, layout: 'public', title: 'Masuk ke Sistem' }
  },

  // Public QR-scanned pages (recipient confirmation)
  {
    path: '/kpm/confirm',
    name: 'recipientConfirm',
    component: RecipientConfirmPanel,
    meta: { requiresAuth: false, layout: 'public', title: 'Konfirmasi Penerimaan KPM' }
  },
  { path: '/confirm', redirect: '/kpm/confirm' },
  { path: '/recipient', redirect: '/kpm/confirm' },
  { path: '/kpm/recipient', redirect: '/kpm/confirm' },

  // Public QR-scanned pages (checker gate)
  {
    path: '/kpm/gate',
    name: 'checkerGate',
    component: CheckerVerifyPanel,
    meta: { requiresAuth: false, layout: 'public', title: 'Verifikasi Checker Gerbang' }
  },
  { path: '/gate', redirect: '/kpm/gate' },
  { path: '/security', redirect: '/kpm/gate' },
  { path: '/kpm/security', redirect: '/kpm/gate' },
  { path: '/checker', redirect: '/kpm/gate' },
  { path: '/kpm/checker', redirect: '/kpm/gate' },

  // Short link resolvers
  {
    path: '/r/:shortId',
    name: 'shortLinkRecipient',
    component: RecipientConfirmPanel,
    meta: { requiresAuth: false, layout: 'public', title: 'Konfirmasi Penerimaan KPM' }
  },
  {
    path: '/s/:shortId',
    name: 'shortLinkChecker',
    component: CheckerVerifyPanel,
    meta: { requiresAuth: false, layout: 'public', title: 'Verifikasi Checker Gerbang' }
  },

  // ─── Authenticated Admin Routes ───────────────────────────
  {
    path: '/',
    redirect: '/kpm'
  },
  {
    path: '/kpm',
    name: 'adminCreate',
    component: AdminCreatePanel,
    meta: { requiresAuth: true, layout: 'auth', mode: 'admin', view: 'create', title: 'Buat KPM Baru' }
  },
  { path: '/create', redirect: '/kpm' },
  { path: '/buat', redirect: '/kpm' },
  { path: '/kpm/create', redirect: '/kpm' },

  {
    path: '/kpm/monitor',
    name: 'adminMonitor',
    component: AdminMonitoringPanel,
    meta: { requiresAuth: true, layout: 'auth', mode: 'admin', view: 'monitor', title: 'Pantau Status KPM' }
  },
  { path: '/monitor', redirect: '/kpm/monitor' },
  { path: '/pantau', redirect: '/kpm/monitor' },

  {
    path: '/kpm/map',
    name: 'adminMap',
    component: LiveTrackingMap,
    meta: { requiresAuth: true, layout: 'auth', mode: 'admin', view: 'map', title: 'Live Radar Armada' }
  },
  { path: '/map', redirect: '/kpm/map' },
  { path: '/radar', redirect: '/kpm/map' },
  { path: '/kpm/radar', redirect: '/kpm/map' },

  {
    path: '/kpm/users',
    name: 'adminUsers',
    component: UserManagementPanel,
    meta: { requiresAuth: true, layout: 'auth', mode: 'admin', view: 'users', title: 'Kelola Pengguna' }
  },
  { path: '/users', redirect: '/kpm/users' },
  { path: '/pengguna', redirect: '/kpm/users' },

  {
    path: '/kpm/tutorial',
    name: 'tutorial',
    component: TutorialPanel,
    meta: { requiresAuth: true, layout: 'auth', view: 'tutorial', title: 'Panduan & Tutorial' }
  },
  { path: '/tutorial', redirect: '/kpm/tutorial' },
  { path: '/panduan', redirect: '/kpm/tutorial' },

  // ─── Authenticated Driver Route ───────────────────────────
  {
    path: '/kpm/personel',
    name: 'driverPortal',
    component: DriverDeliveryPanel,
    meta: { requiresAuth: true, layout: 'auth', mode: 'user', view: 'driver', title: 'Portal Driver' }
  },
  { path: '/personel', redirect: '/kpm/personel' },
  { path: '/driver', redirect: '/kpm/personel' },
  { path: '/admin', redirect: '/kpm' },

  // ─── Catch-All 404 ────────────────────────────────────────
  {
    path: '/:pathMatch(.*)*',
    name: 'notFound',
    component: NotFoundView,
    meta: { requiresAuth: false, layout: 'public', title: '404 Tidak Ditemukan' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0 }
  }
})

// ─── Navigation Guards ───────────────────────────────────────
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  // Auto-load saved session if not yet loaded
  if (!authStore.currentUser) {
    authStore.loadSavedSession()
  }

  // Handle QR auth token in URL
  const qrAuth = to.query.qrAuth || to.query.auth
  if (qrAuth && !authStore.currentUser) {
    authStore.loginWithQr(qrAuth).then(() => {
      // Remove auth params and continue
      const cleanQuery = { ...to.query }
      delete cleanQuery.qrAuth
      delete cleanQuery.auth
      next({ ...to, query: cleanQuery, replace: true })
    }).catch(() => {
      next({ name: 'login', replace: true })
    })
    return
  }

  // Auth-required route without login → redirect to login
  if (to.meta.requiresAuth && !authStore.currentUser) {
    next({ name: 'login', query: { redirect: to.fullPath }, replace: true })
    return
  }

  // Already logged in trying to visit login → redirect to appropriate home
  if (to.name === 'login' && authStore.currentUser) {
    const isDriverRole = authStore.isDriver && !authStore.canSwitchRole
    next({ name: isDriverRole ? 'driverPortal' : 'adminCreate', replace: true })
    return
  }

  // IT users bypass all restrictions
  if (authStore.isIT) {
    next()
    return
  }

  // Role-based access control
  if (to.meta.view === 'users' && !authStore.canManageUsers) {
    next({ name: 'adminCreate', replace: true })
    return
  }

  next()
})

// Update document title after navigation
router.afterEach((to) => {
  if (typeof document !== 'undefined') {
    const suffix = 'KPM Line Feeding'
    const title = to.meta.title ? `${to.meta.title} - ${suffix}` : suffix
    document.title = title
  }
})

export default router
