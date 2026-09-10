import { ref } from 'vue'

const toasts = ref([])
let nextId = 1

export function useToast() {
  function removeToast(id) {
    const idx = toasts.value.findIndex(t => t.id === id)
    if (idx !== -1) {
      toasts.value.splice(idx, 1)
    }
  }

  function addToast({ type = 'info', title = '', message = '', duration = 4500, actionText = '', onAction = null }) {
    const id = nextId++
    const toast = {
      id,
      type,
      title,
      message,
      actionText,
      onAction
    }

    toasts.value.push(toast)

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }

    return id
  }

  function success(message, title = 'Berhasil') {
    return addToast({ type: 'success', title, message })
  }

  function error(message, title = 'Terjadi Kesalahan', duration = 6500, actionText = '', onAction = null) {
    return addToast({ type: 'error', title, message, duration, actionText, onAction })
  }

  function warning(message, title = 'Perhatian') {
    return addToast({ type: 'warning', title, message })
  }

  function info(message, title = 'Informasi') {
    return addToast({ type: 'info', title, message })
  }

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info
  }
}
