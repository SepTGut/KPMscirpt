/**
 * useAuth composable — thin wrapper around Pinia auth store.
 * Preserves the existing API surface for backward compatibility.
 * Components that import useAuth() continue to work without changes.
 */
import { useAuthStore } from '../stores/auth'
import { storeToRefs } from 'pinia'
import { useUiStore } from '../stores/ui'

export function useAuth() {
  const authStore = useAuthStore()
  const uiStore = useUiStore()

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
    loginAttempts,
    cooldownSeconds
  } = storeToRefs(authStore)

  async function loginWithCredentials(payload) {
    const data = await authStore.loginWithCredentials(payload)
    if (data) {
      uiStore.toast.success(`Selamat datang kembali, ${data.name || data.username}!`, 'Login Berhasil')
    }
    return data
  }

  async function loginWithGoogle(payload) {
    try {
      return await authStore.loginWithGoogle(payload)
    } catch (e) {
      uiStore.toast.error(e.message, 'Login Gagal')
      throw e
    }
  }

  async function loginWithQr(qrAuthToken) {
    return authStore.loginWithQr(qrAuthToken)
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
    loginAttempts,
    cooldownSeconds,
    switchActiveMode: authStore.switchActiveMode,
    loadSavedSession: authStore.loadSavedSession,
    loginWithCredentials,
    loginWithGoogle,
    loginWithQr,
    logout: authStore.logout
  }
}
