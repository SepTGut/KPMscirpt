import { ref, computed } from 'vue'
import { requestApi } from './useApi'
import { useToast } from './useToast'

// Shared singleton reactive auth state
const currentUser = ref(null)
const loginError = ref('')
const isAuthBusy = ref(false)
const driverName = ref(localStorage.getItem('kpm_driver_name') || '')

// Security: Brute-force Login Rate Limiting
const failedLoginAttempts = ref(0)
const cooldownSeconds = ref(0)
let cooldownInterval = null

// Login attempt tracking for audit (client-side)
const loginAttempts = ref([])
const MAX_LOGIN_ATTEMPTS_LOG = 20

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
  // Persist to sessionStorage for cross-tab audit
  try {
    sessionStorage.setItem('kpm_login_audit', JSON.stringify(loginAttempts.value))
  } catch {}
}

export function useAuth() {
  const toast = useToast()
  const currentPath = typeof window !== 'undefined' ? window.location.pathname.replace(/\/+$/, '') || '/' : '/'
  const mode = ref(currentPath.endsWith('/kpm/personel') ? 'user' : 'admin')

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

  function switchActiveMode(targetMode) {
    if (!canSwitchRole.value && targetMode !== mode.value) return
    mode.value = targetMode
    if (targetMode === 'user' && currentUser.value?.name) {
      driverName.value = currentUser.value.name
    }
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
      toast.warning(msg, 'Akses Dikunci Sementara')
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
      currentUser.value = data
      mode.value = (data.role === 'driver' || data.role === 'user') ? 'user' : 'admin'

      if ((data.role === 'driver' || data.role === 'user') && data.name) {
        driverName.value = data.name
        localStorage.setItem('kpm_driver_name', data.name)
      }

      const sessionStr = JSON.stringify(data)
      if (payload.rememberMe) {
        localStorage.setItem('kpm_user_session', sessionStr)
      } else {
        sessionStorage.setItem('kpm_user_session', sessionStr)
      }

      // NOTE: For production deployment with HTTPS, consider using HttpOnly Secure cookies
      // instead of localStorage/sessionStorage for session tokens.
      // This requires backend support for cookie-based auth.

      toast.success(`Selamat datang kembali, ${data.name || data.username}!`, 'Login Berhasil')
      return data
    } catch (e) {
      failedLoginAttempts.value++
      recordLoginAttempt('credentials', payload.username, false)
      if (failedLoginAttempts.value >= 3) {
        startCooldownTicker(20)
      }
      loginError.value = e.message
      toast.error(e.message, 'Login Gagal')
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
        body: {
          googleEmail: payload.googleEmail
        }
      }, { currentUser: currentUser.value, mode: mode.value })

      if (!data || !data.role) {
        throw new Error('Akun Google tidak terdaftar di sistem pengguna.')
      }

      currentUser.value = data
      mode.value = (data.role === 'driver' || data.role === 'user') ? 'user' : 'admin'

      if ((data.role === 'driver' || data.role === 'user') && data.name) {
        driverName.value = data.name
        localStorage.setItem('kpm_driver_name', data.name)
      }

      const sessionStr = JSON.stringify(data)
      if (payload.rememberMe) {
        localStorage.setItem('kpm_user_session', sessionStr)
      } else {
        sessionStorage.setItem('kpm_user_session', sessionStr)
      }

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
    // Validate QR token format (kpm_usr_* or kpm_st_master_* pattern)
    if (!/^kpm_(usr|st)_[a-z0-9_]+$/.test(qrAuthToken)) {
      throw new Error('Format QR token tidak valid.')
    }
    loginError.value = ''
    isAuthBusy.value = true
    try {
      const data = await requestApi('login', {
        body: {
          qrAuth: qrAuthToken
        }
      }, { currentUser: currentUser.value, mode: mode.value })

      if (!data || !data.role) {
        throw new Error('QR Code Login tidak valid atau tidak terdaftar.')
      }

      currentUser.value = data
      mode.value = (data.role === 'driver' || data.role === 'user') ? 'user' : 'admin'

      if ((data.role === 'driver' || data.role === 'user') && data.name) {
        driverName.value = data.name
        localStorage.setItem('kpm_driver_name', data.name)
      }

      const sessionStr = JSON.stringify(data)
      localStorage.setItem('kpm_user_session', sessionStr)

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

  function logout() {
    localStorage.removeItem('kpm_user_session')
    sessionStorage.removeItem('kpm_user_session')
    currentUser.value = null
  }

  return {
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
  }
}
