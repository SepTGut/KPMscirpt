export const maxDuration = 30

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(204).end()
  }

  const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxXRRDoiIXVt8VwUa7Gq-ZUdEP4YZhHiMoTdPKnSZ4eWMNBclUmQ5d86Zqoaxo76OM1jg/exec'

  const scriptUrl = process.env.GOOGLE_SCRIPT_URL || DEFAULT_SCRIPT_URL
  if (!scriptUrl) {
    return res.status(500).json({
      success: false,
      error: { code: 'PROXY_ERROR', message: 'GOOGLE_SCRIPT_URL belum dikonfigurasi di Environment Variables Vercel.' },
    })
  }

  // Parse parameters safely using WHATWG URL without calling legacy url.parse()
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost'
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const fullUrl = new URL(req.url, `${proto}://${host}`)

  let params = new URLSearchParams(fullUrl.searchParams)
  if (req.method !== 'GET') {
    if (typeof req.body === 'object' && req.body !== null) {
      for (const [key, value] of Object.entries(req.body)) {
        if (value !== undefined) {
          params.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value))
        }
      }
    } else if (typeof req.body === 'string' && req.body.length > 0) {
      const bodyParams = new URLSearchParams(req.body)
      bodyParams.forEach((value, key) => params.set(key, value))
    } else {
      const chunks = []
      for await (const chunk of req) {
        chunks.push(chunk)
      }
      const rawText = Buffer.concat(chunks).toString('utf-8')
      if (rawText) {
        const bodyParams = new URLSearchParams(rawText)
        bodyParams.forEach((value, key) => params.set(key, value))
      }
    }
  }

  const role = params.get('role')
  params.delete('role')

  const token = role === 'admin'
    ? process.env.ADMIN_TOKEN
    : role === 'user'
      ? process.env.DRIVER_TOKEN
      : process.env.ADMIN_TOKEN

  if (!token) {
    return res.status(500).json({
      success: false,
      error: { code: 'PROXY_ERROR', message: `Token role '${role || 'unknown'}' belum dikonfigurasi di Environment Variables Vercel (ADMIN_TOKEN / DRIVER_TOKEN).` },
    })
  }

  params.set('apiToken', token)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 28000)

  try {
    let upstreamUrl = scriptUrl
    const requestOptions = {
      method: req.method === 'GET' ? 'GET' : 'POST',
      signal: controller.signal,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    }

    if (req.method === 'GET') {
      const url = new URL(scriptUrl)
      params.forEach((value, key) => url.searchParams.set(key, value))
      upstreamUrl = url.toString()
    } else {
      requestOptions.body = params.toString()
    }

    const upstream = await fetch(upstreamUrl, requestOptions)
    const body = await upstream.text()

    try {
      JSON.parse(body)
    } catch {
      const preview = body.replace(/\s+/g, ' ').trim().slice(0, 160)
      return res.status(502).json({
        success: false,
        error: { code: 'PROXY_ERROR', message: `Apps Script mengembalikan respons non-JSON (HTTP ${upstream.status}). Cuplikan: ${preview}` },
      })
    }

    res.setHeader('content-type', 'application/json; charset=utf-8')

    const action = params.get('action') || ''
    const isForceRefresh = params.get('refresh') === 'true'

    if (req.method === 'GET' && action === 'getMasterData') {
      res.setHeader('cache-control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    } else if (req.method === 'GET' && (action === 'getMonitoring' || action === 'getDeliveries') && !isForceRefresh) {
      res.setHeader('cache-control', 'public, s-maxage=6, stale-while-revalidate=15')
    } else {
      res.setHeader('cache-control', 'no-store')
    }

    return res.status(upstream.status).send(body)
  } catch (error) {
    const message = error?.name === 'AbortError'
      ? 'Permintaan ke Google Apps Script mengalami batas waktu (timeout).'
      : `Tidak dapat terhubung ke Google Apps Script: ${error?.message || error}`
    return res.status(502).json({
      success: false,
      error: { code: 'PROXY_ERROR', message },
    })
  } finally {
    clearTimeout(timeout)
  }
}
