import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../src/stores/auth'

describe('Authentication Store (useAuthStore)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const store = new Map()
    globalThis.localStorage = {
      getItem: (k) => store.get(k) || null,
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
      get length() { return store.size },
      key: (i) => Array.from(store.keys())[i] || null
    }
  })

  it('initializes with default unauthenticated state', () => {
    const auth = useAuthStore()
    expect(auth.currentUser).toBeNull()
    expect(auth.isLoggedIn).toBe(false)
    expect(auth.isIT).toBe(false)
    expect(auth.isAdmin).toBe(false)
    expect(auth.isDriver).toBe(true) // Defaults to driver view when unauthenticated
  })

  it('correctly calculates IT role privileges', () => {
    const auth = useAuthStore()
    auth.currentUser = { username: 'ST', role: 'IT', name: 'Setyo Guntur' }

    expect(auth.isLoggedIn).toBe(true)
    expect(auth.isIT).toBe(true)
    expect(auth.isSuperAdmin).toBe(true)
    expect(auth.isAdmin).toBe(true)
    expect(auth.canSwitchRole).toBe(true)
    expect(auth.canOverrideStatus).toBe(true)
    expect(auth.canManageUsers).toBe(true)
  })

  it('correctly calculates Admin role privileges', () => {
    const auth = useAuthStore()
    auth.currentUser = { username: 'admin1', role: 'admin', name: 'Admin Gudang' }

    expect(auth.isLoggedIn).toBe(true)
    expect(auth.isIT).toBe(false)
    expect(auth.isSuperAdmin).toBe(false)
    expect(auth.isAdmin).toBe(true)
    expect(auth.isDriver).toBe(false)
    expect(auth.canSwitchRole).toBe(false)
  })

  it('correctly calculates Driver role privileges', () => {
    const auth = useAuthStore()
    auth.currentUser = { username: 'driver1', role: 'driver', name: 'Budi Santoso' }

    expect(auth.isLoggedIn).toBe(true)
    expect(auth.isIT).toBe(false)
    expect(auth.isAdmin).toBe(false)
    expect(auth.isDriver).toBe(true)
    expect(auth.canSwitchRole).toBe(false)
  })

  it('clears state on logout', () => {
    const auth = useAuthStore()
    auth.currentUser = { username: 'admin1', role: 'admin' }
    localStorage.setItem('kpm_user_session', JSON.stringify({ username: 'admin1' }))

    auth.logout()

    expect(auth.currentUser).toBeNull()
    expect(auth.isLoggedIn).toBe(false)
    expect(localStorage.getItem('kpm_user_session')).toBeNull()
  })

  it('switches mode between admin and user', () => {
    const auth = useAuthStore()
    expect(auth.mode).toBe('admin')

    auth.switchActiveMode('user')
    expect(auth.mode).toBe('user')

    auth.switchActiveMode('admin')
    expect(auth.mode).toBe('admin')
  })
})
