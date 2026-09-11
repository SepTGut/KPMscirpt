import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * UI state store: theme, online status, toast queue.
 */
export const useUiStore = defineStore('ui', () => {
  // ─── Theme State ───────────────────────────────────────────
  const THEME_KEY = 'kpm_theme'
  const theme = ref('system') // 'light' | 'dark' | 'system'
  const isDark = ref(false)

  function calculateEffectiveDark() {
    if (typeof window === 'undefined') return false
    if (theme.value === 'dark') return true
    if (theme.value === 'light') return false
    return Boolean(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
  }

  function applyTheme() {
    if (typeof window === 'undefined') return
    const effectiveDark = calculateEffectiveDark()
    isDark.value = effectiveDark
    if (effectiveDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  function setTheme(newTheme) {
    theme.value = newTheme
    try {
      localStorage.setItem(THEME_KEY, newTheme)
    } catch {}
    applyTheme()
  }

  function toggleDark() {
    setTheme(isDark.value ? 'light' : 'dark')
  }

  function cycleTheme() {
    const modes = ['light', 'dark', 'system']
    const idx = modes.indexOf(theme.value)
    setTheme(modes[(idx + 1) % modes.length])
  }

  // Initialize theme from localStorage
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(THEME_KEY)
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        theme.value = saved
      }
    } catch {}
    applyTheme()

    // Listen for system preference changes
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (theme.value === 'system') applyTheme()
      })
    }

    // Cross-tab theme sync
    window.addEventListener('storage', (e) => {
      if (e.key === THEME_KEY && e.newValue) {
        if (['light', 'dark', 'system'].includes(e.newValue)) {
          theme.value = e.newValue
          applyTheme()
        }
      }
    })
  }

  // ─── Network Status ────────────────────────────────────────
  const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)

  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => { isOnline.value = true })
    window.addEventListener('offline', () => { isOnline.value = false })
  }

  // ─── Toast Queue ───────────────────────────────────────────
  const toasts = ref([])
  let toastIdCounter = 0

  function addToast(type, message, title = '', duration = 5000) {
    const id = ++toastIdCounter
    toasts.value.push({ id, type, message, title, duration })
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration)
    }
    return id
  }

  function removeToast(id) {
    const idx = toasts.value.findIndex(t => t.id === id)
    if (idx !== -1) toasts.value.splice(idx, 1)
  }

  const toast = {
    success: (msg, title) => addToast('success', msg, title),
    error: (msg, title) => addToast('error', msg, title),
    warning: (msg, title) => addToast('warning', msg, title),
    info: (msg, title) => addToast('info', msg, title)
  }

  return {
    // Theme
    theme,
    isDark,
    setTheme,
    toggleDark,
    cycleTheme,

    // Network
    isOnline,

    // Toasts
    toasts,
    addToast,
    removeToast,
    toast
  }
})
