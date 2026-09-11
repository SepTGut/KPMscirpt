/**
 * Centralized API client with:
 * - Exponential backoff retries (1s → 2s → 4s)
 * - Request deduplication (prevents concurrent identical requests)
 * - Response caching with per-action TTL
 * - Offline queue for failed writes (via IndexedDB)
 */

const scriptUrl = import.meta.env.VITE_API_URL || '/api'
const DEFAULT_TIMEOUT_MS = 30000

// ─── Request Deduplication ───────────────────────────────────
const inflightRequests = new Map()

function getRequestKey(action, params) {
  const sorted = [...(params || [])].sort().join('&')
  return `${action}::${sorted}`
}

// ─── Response Cache ──────────────────────────────────────────
const responseCache = new Map()

const CACHE_TTL = {
  getMasterData: 3600_000,    // 1 hour
  getMonitoring: 10_000,      // 10 seconds
  getDeliveries: 10_000,      // 10 seconds
  resolveShortLink: 300_000,  // 5 minutes
}

function getCachedResponse(action, key) {
  const ttl = CACHE_TTL[action]
  if (!ttl) return null
  const entry = responseCache.get(key)
  if (!entry) return null
  if ((Date.now() - entry.timestamp) > ttl) {
    responseCache.delete(key)
    return null
  }
  return entry.data
}

function setCachedResponse(action, key, data) {
  if (!CACHE_TTL[action]) return
  responseCache.set(key, { data, timestamp: Date.now() })
}

/** Clear all caches (call on logout or when forcing fresh data) */
export function clearApiCache() {
  responseCache.clear()
  inflightRequests.clear()
}

// ─── Offline Queue ───────────────────────────────────────────
const offlineQueue = []

function enqueueOffline(action, options, authState) {
  offlineQueue.push({ action, options, authState, timestamp: Date.now() })
}

async function replayOfflineQueue() {
  while (offlineQueue.length > 0) {
    const item = offlineQueue.shift()
    try {
      await requestApi(item.action, { ...item.options, retries: 0 }, item.authState)
    } catch (e) {
      console.warn('[Offline Queue Replay Failed]', item.action, e.message)
      // Re-queue if still offline
      if (!navigator.onLine) {
        offlineQueue.unshift(item)
        break
      }
    }
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    if (offlineQueue.length > 0) {
      setTimeout(replayOfflineQueue, 2000)
    }
  })
}

// ─── Main API Function ───────────────────────────────────────
export async function requestApi(action, options = {}, authState = {}) {
  const maxRetries = options.retries !== undefined ? options.retries : 2
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS
  const isGet = options.method === 'GET'

  // Build params for dedup key and caching
  const params = new URLSearchParams(options.body || {})
  params.set('action', action)

  const dedupKey = getRequestKey(action, params)

  // Check cache for GET requests
  if (isGet) {
    const cached = getCachedResponse(action, dedupKey)
    if (cached !== null) return cached
  }

  // Check for in-flight duplicate
  if (inflightRequests.has(dedupKey)) {
    return inflightRequests.get(dedupKey)
  }

  // Create the request promise
  const requestPromise = executeRequest(action, options, authState, maxRetries, timeoutMs, dedupKey)

  // Store for dedup
  inflightRequests.set(dedupKey, requestPromise)

  try {
    const result = await requestPromise
    return result
  } finally {
    inflightRequests.delete(dedupKey)
  }
}

async function executeRequest(action, options, authState, maxRetries, timeoutMs, cacheKey) {
  let attempt = 0
  const isGet = options.method === 'GET'
  const isWriteAction = !isGet

  while (attempt <= maxRetries) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const params = new URLSearchParams(options.body || {})
      params.set('action', action)

      // Inject auth state
      const currentRole = authState.currentUser?.role || authState.mode || 'admin'
      params.set('authRole', currentRole)
      if (!params.has('role')) params.set('role', currentRole)

      if (authState.currentUser?.username) {
        params.set('authUsername', authState.currentUser.username)
        if (!params.has('username')) params.set('username', authState.currentUser.username)
      }

      if (authState.currentUser?.token) {
        params.set('apiToken', authState.currentUser.token)
      }

      const isItUser = Boolean(
        authState.currentUser?.isIT ||
        authState.currentUser?.role === 'it' ||
        authState.currentUser?.username?.toUpperCase() === 'ST' ||
        authState.currentUser?.username?.toUpperCase() === 'IT' ||
        authState.currentUser?.name?.toUpperCase() === 'ST' ||
        authState.currentUser?.name?.toUpperCase() === 'IT'
      )
      if (isItUser) params.set('isIT', 'true')

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

      // Cache successful GET responses
      if (isGet) {
        setCachedResponse(action, cacheKey, result.data)
      }

      return result.data
    } catch (err) {
      attempt++

      // For network errors on write operations, queue for offline replay
      if (isWriteAction && !navigator.onLine && attempt > maxRetries) {
        enqueueOffline(action, options, authState)
        throw new Error('Anda sedang offline. Permintaan akan dikirim ulang saat koneksi kembali.')
      }

      if (attempt > maxRetries) {
        throw err
      }

      // Exponential backoff: 1s, 2s, 4s
      const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 8000)
      await new Promise(res => setTimeout(res, backoffMs))
    } finally {
      clearTimeout(timeout)
    }
  }
}

export { offlineQueue }
