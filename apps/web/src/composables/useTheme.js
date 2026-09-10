import { ref, watch } from 'vue'

const THEME_KEY = 'kpm_theme'

// Shared reactive state across components
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

// Immediate module initialization (runs before any component mounts)
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      theme.value = saved
    }
  } catch {}

  applyTheme()

  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (theme.value === 'system') {
        applyTheme()
      }
    })
  }

  // Cross-tab theme sync
  window.addEventListener('storage', (e) => {
    if (e.key === THEME_KEY && e.newValue) {
      if (e.newValue === 'light' || e.newValue === 'dark' || e.newValue === 'system') {
        theme.value = e.newValue
      }
    }
  })
}

// Watch theme change and sync to localStorage and DOM
watch(theme, (newVal) => {
  try {
    localStorage.setItem(THEME_KEY, newVal)
  } catch {}
  applyTheme()
})

export function useTheme() {
  function setTheme(newTheme) {
    theme.value = newTheme
  }

  function toggleDark() {
    if (isDark.value) {
      setTheme('light')
    } else {
      setTheme('dark')
    }
  }

  return {
    theme,
    isDark,
    setTheme,
    toggleDark
  }
}
