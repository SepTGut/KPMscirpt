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

export default async function handler(request) {
  const scriptUrl = process.env.GOOGLE_SCRIPT_URL
  if (!scriptUrl) return errorResponse(500, 'GOOGLE_SCRIPT_URL belum dikonfigurasi di Netlify.')

  const params = request.method === 'GET'
    ? new URL(request.url).searchParams
    : new URLSearchParams(await request.text())
  const role = params.get('role')
  params.delete('role')

  const token = role === 'admin'
    ? process.env.ADMIN_TOKEN
    : role === 'user'
      ? process.env.DRIVER_TOKEN
      : ''
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
      return errorResponse(502, 'Apps Script returned a non-JSON response. Check the deployment URL and set Web app access to Anyone.')
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
