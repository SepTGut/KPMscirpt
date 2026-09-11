/**
 * useKpm composable — thin wrapper around Pinia kpm store.
 * Preserves the existing API surface for backward compatibility.
 * Components that import useKpm() continue to work without changes.
 */
import { useKpmStore, sanitizeSpreadsheetInput } from '../stores/kpm'
import { storeToRefs } from 'pinia'
import { onMounted } from 'vue'

export { sanitizeSpreadsheetInput }

export function useKpm() {
  const kpmStore = useKpmStore()

  const {
    master,
    monitoring,
    deliveries,
    selectedDelivery,
    filter,
    archivedLoaded,
    busy,
    message,
    error,
    isPollingActive,
    pollingSecondsLeft,
    editingKpm,
    editItemsList,
    isITUser,
    filteredMonitoring,
    kpiStats
  } = storeToRefs(kpmStore)

  onMounted(() => {
    kpmStore.startPollingTimer()
  })

  return {
    // Reactive refs
    master,
    monitoring,
    deliveries,
    selectedDelivery,
    filter,
    archivedLoaded,
    busy,
    message,
    error,
    isPollingActive,
    pollingSecondsLeft,
    editingKpm,
    editItemsList,
    isITUser,
    filteredMonitoring,
    kpiStats,

    // Store actions & helpers
    isTestItem: kpmStore.isTestItem,
    clearNotice: kpmStore.clearNotice,
    saveDraft: kpmStore.saveDraft,
    loadDraft: kpmStore.loadDraft,
    clearDraft: kpmStore.clearDraft,
    startPollingTimer: kpmStore.startPollingTimer,
    togglePolling: kpmStore.togglePolling,
    cleanOrphanedAndTestRows: kpmStore.cleanOrphanedAndTestRows,
    loadMaster: kpmStore.loadMaster,
    loadMonitoring: kpmStore.loadMonitoring,
    loadDeliveries: kpmStore.loadDeliveries,
    handleCreateKpm: kpmStore.handleCreateKpm,
    handleArchiveKpm: kpmStore.handleArchiveKpm,
    handleAdminChangeStatus: kpmStore.handleAdminChangeStatus,
    startEditLatestKpm: kpmStore.startEditLatestKpm,
    addEditItem: kpmStore.addEditItem,
    removeEditItem: kpmStore.removeEditItem,
    saveLatestKpmItems: kpmStore.saveLatestKpmItems,
    handleDriverStatusUpdate: kpmStore.handleDriverStatusUpdate,
    handleStageArrival: kpmStore.handleStageArrival,
    handleConfirmArrival: kpmStore.handleConfirmArrival,
    sanitizeSpreadsheetInput
  }
}
