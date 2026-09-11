/**
 * useTheme composable — thin wrapper around Pinia UI store.
 * Preserves backward compatibility with existing components.
 */
import { useUiStore } from '../stores/ui'
import { storeToRefs } from 'pinia'

export function useTheme() {
  const uiStore = useUiStore()
  const { theme, isDark } = storeToRefs(uiStore)

  return {
    theme,
    isDark,
    setTheme: uiStore.setTheme,
    toggleDark: uiStore.toggleDark,
    cycleTheme: uiStore.cycleTheme
  }
}
