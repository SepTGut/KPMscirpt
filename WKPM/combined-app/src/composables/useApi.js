/**
 * Centralized API client composable with timeout, token injection, and auto-retry logic.
 */

const scriptUrl = import.meta.env.VITE_API_URL || '/api'
const DEFAULT_TIMEOUT_MS = 30000

export async function requestApi(action, options = {}, authState = {}) {
  const maxRetries = options.retries !== undefined ? options.retries : 1
  let attempt = 0

  while (attempt <= maxRetries) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs || DEFAULT_TIMEOUT_MS)

    try {
      const params = new URLSearchParams(options.body || {})
      params.set('action', action)

      const currentRole = authState.currentUser?.role || authState.mode || 'admin'
      params.set('role', currentRole)

      if (authState.currentUser?.token) {
        params.set('apiToken', authState.currentUser.token)
      }

      const isGet = options.method === 'GET'
      const fetchUrl = isGet ? `${scriptUrl}?${params}` : scriptUrl

      const response = await fetch(fetchUrl, {
        method: options.method || 'POST',
        body: isGet ? undefined : params,
        cache: 'no-store',
        signal: controller.signal,
      })

      const result = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(result?.error?.message || `Server returned ${response.status}`)
      }
      if (!result?.success) {
        const detail = result?.error?.message || result?.error?.code
        throw new Error(detail || `API menolak permintaan: ${JSON.stringify(result)}`)
      }

      return result.data
    } catch (err) {
      attempt++
      if (attempt > maxRetries) {
        throw err
      }
      // Brief exponential backoff before retry (1.2s)
      await new Promise(res => setTimeout(res, 1200))
    } finally {
      clearTimeout(timeout)
    }
  }
}
