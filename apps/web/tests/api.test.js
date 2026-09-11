import { describe, it, expect, beforeEach, vi } from 'vitest'
import { requestApi, clearApiCache } from '../src/composables/useApi'

describe('API Client (useApi)', () => {
  beforeEach(() => {
    clearApiCache()
    vi.restoreAllMocks()
  })

  it('serves subsequent cached GET requests without extra network calls', async () => {
    const mockData = { workshops: ['Tiron', 'Sukosari'] }
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockData }),
    })

    // First call -> fetches from network
    const res1 = await requestApi('getMasterData', { method: 'GET' })
    expect(res1).toEqual(mockData)
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    // Second call -> served from cache
    const res2 = await requestApi('getMasterData', { method: 'GET' })
    expect(res2).toEqual(mockData)
    expect(fetchSpy).toHaveBeenCalledTimes(1) // Still 1!
  })

  it('deduplicates concurrent in-flight requests', async () => {
    let resolveNetwork
    const networkPromise = new Promise((resolve) => {
      resolveNetwork = resolve
    })

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      networkPromise.then(() => ({
        ok: true,
        json: async () => ({ success: true, data: [{ nomor: 'KPM-001' }] }),
      }))
    )

    // Fire two identical GET requests concurrently
    const p1 = requestApi('getMonitoring', { method: 'GET' })
    const p2 = requestApi('getMonitoring', { method: 'GET' })

    // Resolve network
    resolveNetwork()

    const [r1, r2] = await Promise.all([p1, p2])
    expect(r1).toEqual([{ nomor: 'KPM-001' }])
    expect(r2).toEqual([{ nomor: 'KPM-001' }])
    expect(fetchSpy).toHaveBeenCalledTimes(1) // Deduplicated to a single fetch
  })

  it('throws error when server responds with success: false', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        success: false,
        error: { message: 'Data KPM tidak ditemukan.' },
      }),
    })

    await expect(requestApi('getMonitoring', { method: 'GET', retries: 0 })).rejects.toThrow(
      'Data KPM tidak ditemukan.'
    )
  })
})
