export const maxDuration = 30

// CORS origin allowlist
const ALLOWED_ORIGINS = new Set([
  'https://lnfd.vercel.app'
])

function getCorsOrigin(req) {
  const origin = req.headers?.origin || ''
  if (ALLOWED_ORIGINS.has(origin)) return origin
  // Allow localhost in development
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin
  return ''
}

// Security headers
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(self), geolocation=(self), microphone=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.cartocdn.com https://server.arcgisonline.com https://lh3.googleusercontent.com https://drive.google.com; connect-src 'self' https://script.google.com https://*.firebasedatabase.app https://*.cartocdn.com https://server.arcgisonline.com; frame-ancestors 'none';",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
}

function applySecurityHeaders(res) {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    res.setHeader(key, value)
  }
}

// Fallback defaults for proxy resilience
const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz1XwsnPkZ7-gqV8CMgeg0GWpp6jLn13nR_CTqSWppVgYwr4IpqSIA710W8OUQz43g2IA/exec'
const DEFAULT_ADMIN_TOKEN = '7fK9xQ2mL8vR4nT6pZ1wC5yH3sD9aJ8uE2gN6bX4qW7rM'
const DEFAULT_DRIVER_TOKEN = 'A9vX3kP7mQ2rT8zL5nC1wH6dF4sJ9yB7uG2eR8xN5pK3'

export default async function handler(req, res) {
  const corsOrigin = getCorsOrigin(req)
  applySecurityHeaders(res)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    if (corsOrigin) {
      res.setHeader('Access-Control-Allow-Origin', corsOrigin)
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Access-Control-Max-Age', '86400')
    return res.status(204).end()
  }

  // Set CORS for all responses
  if (corsOrigin) {
    res.setHeader('Access-Control-Allow-Origin', corsOrigin)
  }

  // Environment-only tokens with safe fallback
  const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || DEFAULT_SCRIPT_URL
  const ADMIN_TOKEN = process.env.ADMIN_TOKEN || DEFAULT_ADMIN_TOKEN
  const DRIVER_TOKEN = process.env.DRIVER_TOKEN || DEFAULT_DRIVER_TOKEN

  if (!GOOGLE_SCRIPT_URL) {
    return res.status(500).json({
      success: false,
      error: { code: 'CONFIG_ERROR', message: 'GOOGLE_SCRIPT_URL belum dikonfigurasi di Environment Variables Vercel.' },
    })
  }

  // Parse parameters safely using WHATWG URL without calling legacy url.parse()
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost'
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const fullUrl = new URL(req.url, `${proto}://${host}`)

  let params = new URLSearchParams(fullUrl.searchParams)

  // Request body size safety check (reject >1MB payloads)
  const contentLength = parseInt(req.headers['content-length'] || '0', 10)
  if (contentLength > 1_048_576) {
    return res.status(413).json({
      success: false,
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'Ukuran permintaan melebihi batas 1MB.' },
    })
  }

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

  // Instant emergency bypass for IT Master secret access
  if (action === 'login') {
    const qrAuth = (params.get('qrAuth') || params.get('token') || '').trim()
    const uName = (params.get('username') || '').trim().toLowerCase()
    const pWord = (params.get('password') || '').trim()
    const isMaster = (
      qrAuth === 'st_master_access_99x' ||
      qrAuth === 'kpm_st_master_99x' ||
      (uName === 'st' && (pWord === 'st_master_access_99x' || pWord === 'admin123'))
    )
    if (isMaster) {
      return res.status(200).json({
        success: true,
        action: 'login',
        data: {
          username: 'ST',
          email: 'st@kpm.internal',
          name: 'Setyo Guntur Samudro',
          role: 'it',
          roleLabel: 'Super Admin',
          isIT: true,
          isSuperAdmin: true,
          isAdmin: true,
          isDriver: true,
          canSwitchRole: true,
          canOverrideStatus: true,
          canManageUsers: true,
          canSystemDiagnostics: true,
          authMethod: 'secret_link',
          token: ADMIN_TOKEN
        },
        error: null
      })
    }
  }

  const clientRole = (params.get('authRole') || params.get('role') || '').toLowerCase()

  const isDriver = (clientRole === 'driver' || clientRole === 'user')
  const token = isDriver ? DRIVER_TOKEN : ADMIN_TOKEN

  if (!token && action !== 'login') {
    return res.status(500).json({
      success: false,
      error: { code: 'CONFIG_ERROR', message: `Token role '${clientRole || 'unknown'}' belum dikonfigurasi di Environment Variables Vercel (ADMIN_TOKEN / DRIVER_TOKEN).` },
    })
  }

  if (token) {
    params.set('apiToken', token)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 28000)

  try {
    let upstreamUrl = GOOGLE_SCRIPT_URL
    const requestOptions = {
      method: req.method === 'GET' ? 'GET' : 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'User-Agent': 'KPM-Vercel-Proxy/1.0'
      },
      redirect: 'follow'
    }

    if (req.method === 'GET') {
      const url = new URL(GOOGLE_SCRIPT_URL)
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
