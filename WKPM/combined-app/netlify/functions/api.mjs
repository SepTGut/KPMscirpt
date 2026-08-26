const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
}

function errorResponse(status, message) {
  return new Response(JSON.stringify({
    success: false,
    error: { code: 'PROXY_ERROR', message },
  }), { status, headers: JSON_HEADERS })
}

const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxXRRDoiIXVt8VwUa7Gq-ZUdEP4YZhHiMoTdPKnSZ4eWMNBclUmQ5d86Zqoaxo76OM1jg/exec'
const DEFAULT_ADMIN_TOKEN = '7fK9xQ2mL8vR4nT6pZ1wC5yH3sD9aJ8uE2gN6bX4qW7rM'
const DEFAULT_DRIVER_TOKEN = 'A9vX3kP7mQ2rT8zL5nC1wH6dF4sJ9yB7uG2eR8xN5pK3'

export default async function handler(request) {
  const scriptUrl = process.env.GOOGLE_SCRIPT_URL || DEFAULT_SCRIPT_URL
  if (!scriptUrl) return errorResponse(500, 'GOOGLE_SCRIPT_URL belum dikonfigurasi di Netlify.')

  const params = request.method === 'GET'
    ? new URL(request.url).searchParams
    : new URLSearchParams(await request.text())
  const role = params.get('role')
  params.delete('role')

  const token = role === 'admin'
    ? (process.env.ADMIN_TOKEN || DEFAULT_ADMIN_TOKEN)
    : role === 'user'
      ? (process.env.DRIVER_TOKEN || DEFAULT_DRIVER_TOKEN)
      : (process.env.ADMIN_TOKEN || DEFAULT_ADMIN_TOKEN)
  if (!token) return errorResponse(500, 'Token role belum dikonfigurasi di Netlify.')

  params.set('apiToken', token)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)
  try {
    let upstreamUrl = scriptUrl
    const requestOptions = {
      method: request.method === 'GET' ? 'GET' : 'POST',
      signal: controller.signal,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    }

    if (request.method === 'GET') {
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
      return errorResponse(502, `Apps Script returned a non-JSON response (HTTP ${upstream.status}). Check the deployed version, doPost(e), and Web app access. Response: ${preview}`)
    }
    return new Response(body, {
      status: upstream.status,
      headers: JSON_HEADERS,
    })
  } catch (error) {
    const message = error?.name === 'AbortError'
      ? 'Apps Script request timed out.'
      : 'Tidak dapat terhubung ke Apps Script.'
    return errorResponse(502, message)
  } finally {
    clearTimeout(timeout)
  }
}
