export const maxDuration = 30

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(204).end()
  }

  const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz1XwsnPkZ7-gqV8CMgeg0GWpp6jLn13nR_CTqSWppVgYwr4IpqSIA710W8OUQz43g2IA/exec'
  const DEFAULT_ADMIN_TOKEN = '7fK9xQ2mL8vR4nT6pZ1wC5yH3sD9aJ8uE2gN6bX4qW7rM'
  const DEFAULT_DRIVER_TOKEN = 'A9vX3kP7mQ2rT8zL5nC1wH6dF4sJ9yB7uG2eR8xN5pK3'

  const envUrl = (process.env.GOOGLE_SCRIPT_URL || '').trim()
  const scriptUrl = envUrl.includes('AKfycbz1XwsnPkZ7') ? envUrl : DEFAULT_SCRIPT_URL

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

  const action = params.get('action') || ''
  const role = params.get('role')
  params.delete('role')

  const token = role === 'admin'
    ? (process.env.ADMIN_TOKEN || DEFAULT_ADMIN_TOKEN)
    : role === 'user'
      ? (process.env.DRIVER_TOKEN || DEFAULT_DRIVER_TOKEN)
      : (process.env.ADMIN_TOKEN || process.env.DRIVER_TOKEN || DEFAULT_ADMIN_TOKEN)

  if (!token && action !== 'login') {
    return res.status(500).json({
      success: false,
      error: { code: 'PROXY_ERROR', message: `Token role '${role || 'unknown'}' belum dikonfigurasi di Environment Variables Vercel (ADMIN_TOKEN / DRIVER_TOKEN).` },
    })
  }

  if (token) {
    params.set('apiToken', token)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 28000)

  try {
    let upstreamUrl = scriptUrl
    const requestOptions = {
      method: req.method === 'GET' ? 'GET' : 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      redirect: 'follow'
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
        error: { code: 'PROXY_ERROR', message: `Apps Script (${upstreamUrl}) mengembalikan respons non-JSON (HTTP ${upstream.status}). Cuplikan: ${preview}` },
      })
    }

    res.setHeader('content-type', 'application/json; charset=utf-8')

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
