import { ref, computed } from 'vue'
import { requestApi } from './useApi'

// Shared singleton reactive auth state
const currentUser = ref(null)
const loginError = ref('')
const isAuthBusy = ref(false)
const driverName = ref(localStorage.getItem('kpm_driver_name') || '')

export function useAuth() {
  const currentPath = typeof window !== 'undefined' ? window.location.pathname.replace(/\/+$/, '') || '/' : '/'
  const mode = ref(currentPath.endsWith('/kpm/personel') ? 'user' : 'admin')

  const isLoggedIn = computed(() => !!currentUser.value)
  const isIT = computed(() => currentUser.value?.role === 'it' || !!currentUser.value?.isIT)
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

  function loadSavedSession() {
    if (typeof localStorage === 'undefined') return
    const saved = localStorage.getItem('kpm_user_session') || sessionStorage.getItem('kpm_user_session')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
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

      currentUser.value = data
      mode.value = data.role === 'admin' ? 'admin' : 'user'

      if (data.role === 'user' && data.name) {
        driverName.value = data.name
        localStorage.setItem('kpm_driver_name', data.name)
      }

      const sessionStr = JSON.stringify(data)
      if (payload.rememberMe) {
        localStorage.setItem('kpm_user_session', sessionStr)
      } else {
        sessionStorage.setItem('kpm_user_session', sessionStr)
      }

      return data
    } catch (e) {
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
        body: {
          googleEmail: payload.googleEmail
        }
      }, { currentUser: currentUser.value, mode: mode.value })

      if (!data || !data.role) {
        throw new Error('Akun Google tidak terdaftar di sistem pengguna.')
      }

      currentUser.value = data
      mode.value = data.role === 'admin' ? 'admin' : 'user'

      if (data.role === 'user' && data.name) {
        driverName.value = data.name
        localStorage.setItem('kpm_driver_name', data.name)
      }

      const sessionStr = JSON.stringify(data)
      if (payload.rememberMe) {
        localStorage.setItem('kpm_user_session', sessionStr)
      } else {
        sessionStorage.setItem('kpm_user_session', sessionStr)
      }

      return data
    } catch (e) {
      loginError.value = e.message
      throw e
    } finally {
      isAuthBusy.value = false
    }
  }

  async function loginWithQr(qrAuthToken) {
    if (!qrAuthToken) return null
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
      mode.value = data.role === 'admin' ? 'admin' : 'user'

      if (data.role === 'user' && data.name) {
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
