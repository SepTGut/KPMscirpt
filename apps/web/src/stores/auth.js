import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { requestApi } from '../composables/useApi'

/**
 * Centralized authentication store.
 * Manages user session, role computation, login/logout flows,
 * brute-force rate limiting, and audit logging.
 */
export const useAuthStore = defineStore('auth', () => {
  // ─── State ─────────────────────────────────────────────────
  const currentUser = ref(null)
  const loginError = ref('')
  const isAuthBusy = ref(false)
  const driverName = ref(
    typeof localStorage !== 'undefined' ? (localStorage.getItem('kpm_driver_name') || '') : ''
  )
  const mode = ref('admin') // 'admin' | 'user'

  // Brute-force protection
  const failedLoginAttempts = ref(0)
  const cooldownSeconds = ref(0)
  let cooldownInterval = null

  // Client-side audit log
  const loginAttempts = ref([])
  const MAX_LOGIN_ATTEMPTS_LOG = 20

  // ─── Getters ───────────────────────────────────────────────
  const isLoggedIn = computed(() => !!currentUser.value)
  const isCooldownActive = computed(() => cooldownSeconds.value > 0)

  const isIT = computed(() => {
    const u = currentUser.value
    if (!u) return false
    const r = String(u.role || '').toLowerCase()
    const uname = String(u.username || '').toLowerCase()
    const name = String(u.name || u.fullName || '').toLowerCase()
    return r === 'it' || r === 'maker' || r === 'makers' || !!u.isIT || uname === 'st' || uname === 'it' || name === 'st' || name === 'it'
  })

  const isSuperAdmin = computed(() => currentUser.value?.role === 'super_admin' || !!currentUser.value?.isSuperAdmin || isIT.value)
  const isAdmin = computed(() => currentUser.value?.role === 'admin' || !!currentUser.value?.isAdmin || isSuperAdmin.value)
  const isDriver = computed(() => currentUser.value?.role === 'driver' || (!isAdmin.value && !isSuperAdmin.value && !isIT.value))
  const canSwitchRole = computed(() => isSuperAdmin.value || isIT.value)
  const canOverrideStatus = computed(() => isSuperAdmin.value || isIT.value)
  const canManageUsers = computed(() => isSuperAdmin.value || isIT.value)
  const canSystemDiagnostics = computed(() => isIT.value)

  // ─── Internal Helpers ──────────────────────────────────────
  function recordLoginAttempt(method, identifier, success) {
    const attempt = {
      timestamp: Date.now(),
      method,
      identifier: identifier ? String(identifier).substring(0, 50) : 'unknown',
      success
    }
    loginAttempts.value.unshift(attempt)
    if (loginAttempts.value.length > MAX_LOGIN_ATTEMPTS_LOG) {
      loginAttempts.value = loginAttempts.value.slice(0, MAX_LOGIN_ATTEMPTS_LOG)
    }
    try {
      sessionStorage.setItem('kpm_login_audit', JSON.stringify(loginAttempts.value))
    } catch {}
  }

  function startCooldownTicker(seconds = 15) {
    cooldownSeconds.value = seconds
    if (cooldownInterval) clearInterval(cooldownInterval)
    cooldownInterval = setInterval(() => {
      if (cooldownSeconds.value > 1) {
        cooldownSeconds.value--
      } else {
        cooldownSeconds.value = 0
        clearInterval(cooldownInterval)
      }
    }, 1000)
  }

  function persistSession(data, rememberMe = false) {
    const sessionStr = JSON.stringify(data)
    if (rememberMe) {
      localStorage.setItem('kpm_user_session', sessionStr)
    } else {
      sessionStorage.setItem('kpm_user_session', sessionStr)
    }
  }

  function setUserFromData(data) {
    currentUser.value = data
    mode.value = (data.role === 'driver' || data.role === 'user') ? 'user' : 'admin'
    if ((data.role === 'driver' || data.role === 'user') && data.name) {
      driverName.value = data.name
      localStorage.setItem('kpm_driver_name', data.name)
    }
  }

  // ─── Actions ───────────────────────────────────────────────
  function switchActiveMode(targetMode) {
    if (!canSwitchRole.value && targetMode !== mode.value) return
    mode.value = targetMode
    if (targetMode === 'user' && currentUser.value?.name) {
      driverName.value = currentUser.value.name
    }
  }

  function loadSavedSession() {
    if (typeof localStorage === 'undefined') return
    const saved = localStorage.getItem('kpm_user_session') || sessionStorage.getItem('kpm_user_session')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // Check session expiration (7 days)
        const now = Date.now()
        if (parsed._sessionTime && (now - parsed._sessionTime) > (7 * 24 * 60 * 60 * 1000)) {
          logout()
          return
        }
        if (parsed && parsed.role) {
          currentUser.value = parsed
          mode.value = (parsed.role === 'driver') ? 'user' : 'admin'
          if (parsed.name) {
            driverName.value = parsed.name
          }
        }
      } catch {}
    }
  }

  async function loginWithCredentials(payload) {
    if (isCooldownActive.value) {
      const msg = `Terlalu banyak percobaan login gagal. Harap tunggu ${cooldownSeconds.value} detik.`
      loginError.value = msg
      throw new Error(msg)
    }

    loginError.value = ''
    isAuthBusy.value = true
    try {
      const data = await requestApi('login', {
        body: {
          username: payload.username,
          password: payload.password
        }
      }, { currentUser: currentUser.value, mode: mode.value })

      if (!data || !data.role) {
        throw new Error('Respons otentikasi tidak valid.')
      }

      failedLoginAttempts.value = 0
      recordLoginAttempt('credentials', payload.username, true)
      data._sessionTime = Date.now()
      setUserFromData(data)
      persistSession(data, payload.rememberMe)
      return data
    } catch (e) {
      failedLoginAttempts.value++
      recordLoginAttempt('credentials', payload.username, false)
      if (failedLoginAttempts.value >= 3) {
        startCooldownTicker(20)
      }
      loginError.value = e.message
      throw e
    } finally {
      isAuthBusy.value = false
    }
  }

  async function loginWithGoogle(payload) {
    loginError.value = ''
    isAuthBusy.value = true
    try {
      const data = await requestApi('login', {
        body: { googleEmail: payload.googleEmail }
      }, { currentUser: currentUser.value, mode: mode.value })

      if (!data || !data.role) {
        throw new Error('Akun Google tidak terdaftar di sistem pengguna.')
      }

      setUserFromData(data)
      persistSession(data, payload.rememberMe)
      recordLoginAttempt('google', payload.googleEmail, true)
      return data
    } catch (e) {
      recordLoginAttempt('google', payload.googleEmail, false)
      loginError.value = e.message
      throw e
    } finally {
      isAuthBusy.value = false
    }
  }

  async function loginWithQr(qrAuthToken) {
    if (!qrAuthToken) return null
    // Validate QR token format (kpm_usr_*, kpm_st_*, or st_master_* pattern)
    if (!/^(kpm_(usr|st)_[a-z0-9_]+|st_[a-z0-9_]+)$/.test(qrAuthToken)) {
      throw new Error('Format QR token tidak valid.')
    }
    loginError.value = ''
    isAuthBusy.value = true
    try {
      const data = await requestApi('login', {
        body: { qrAuth: qrAuthToken }
      }, { currentUser: currentUser.value, mode: mode.value })

      if (!data || !data.role) {
        throw new Error('QR Code Login tidak valid atau tidak terdaftar.')
      }

      setUserFromData(data)
      persistSession(data, true)

      // Clean query parameters from address bar safely
      try {
        const url = new URL(window.location.href)
        url.searchParams.delete('qrAuth')
        url.searchParams.delete('auth')
        window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : ''))
      } catch {}

      return data
    } catch (e) {
      loginError.value = e.message
      throw e
    } finally {
      isAuthBusy.value = false
    }
  }

  function switchActiveMode(newMode) {
    if (newMode === 'admin' || newMode === 'user') {
      mode.value = newMode
    }
  }

  function logout() {
    localStorage.removeItem('kpm_user_session')
    sessionStorage.removeItem('kpm_user_session')
    currentUser.value = null
    mode.value = 'admin'
  }

  // ─── Initialize ────────────────────────────────────────────
  // Set initial mode from URL path
  if (typeof window !== 'undefined') {
    const path = window.location.pathname.replace(/\/+$/, '') || '/'
    if (path.endsWith('/kpm/personel')) {
      mode.value = 'user'
    }
  }

  return {
    // State
    currentUser,
    loginError,
    isAuthBusy,
    driverName,
    mode,
    loginAttempts,
    cooldownSeconds,

    // Getters
    isLoggedIn,
    isCooldownActive,
    isIT,
    isSuperAdmin,
    isAdmin,
    isDriver,
    canSwitchRole,
    canOverrideStatus,
    canManageUsers,
    canSystemDiagnostics,

    // Actions
    switchActiveMode,
    loadSavedSession,
    loginWithCredentials,
    loginWithGoogle,
    loginWithQr,
    logout
  }
})
