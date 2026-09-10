import { ref, watch, onMounted } from 'vue'

const THEME_KEY = 'kpm_theme'

// Shared state across components
const theme = ref('system') // 'light' | 'dark' | 'system'
const isDark = ref(false)

function applyTheme() {
  if (typeof window === 'undefined') return

  let effectiveDark = false
  if (theme.value === 'dark') {
    effectiveDark = true
  } else if (theme.value === 'light') {
    effectiveDark = false
  } else {
    effectiveDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  isDark.value = effectiveDark
  if (effectiveDark) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

export function useTheme() {
  onMounted(() => {
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
  })

  watch(theme, (newVal) => {
    try {
      localStorage.setItem(THEME_KEY, newVal)
    } catch {}
    applyTheme()
  })

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
