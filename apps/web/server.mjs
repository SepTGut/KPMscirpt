import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = parseInt(process.env.PORT || '3000', 10)
const DIST_DIR = path.resolve(__dirname, 'dist')
const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz1XwsnPkZ7-gqV8CMgeg0GWpp6jLn13nR_CTqSWppVgYwr4IpqSIA710W8OUQz43g2IA/exec'
const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || DEFAULT_SCRIPT_URL
const DEFAULT_ADMIN_TOKEN = '7fK9xQ2mL8vR4nT6pZ1wC5yH3sD9aJ8uE2gN6bX4qW7rM'
const DEFAULT_DRIVER_TOKEN = 'A9vX3kP7mQ2rT8zL5nC1wH6dF4sJ9yB7uG2eR8xN5pK3'
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || DEFAULT_ADMIN_TOKEN
const DRIVER_TOKEN = process.env.DRIVER_TOKEN || DEFAULT_DRIVER_TOKEN

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
}

async function handleApiProxy(req, res) {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    })
    return res.end()
  }

  const host = req.headers.host || `localhost:${PORT}`
  const proto = req.headers['x-forwarded-proto'] || 'http'
  const fullUrl = new URL(req.url, `${proto}://${host}`)
  let params = new URLSearchParams(fullUrl.searchParams)

  if (req.method !== 'GET') {
    const chunks = []
    for await (const chunk of req) {
      chunks.push(chunk)
    }
    const rawBody = Buffer.concat(chunks).toString('utf-8')
    if (rawBody) {
      try {
        if (req.headers['content-type']?.includes('application/json')) {
          const jsonObj = JSON.parse(rawBody)
          for (const [k, v] of Object.entries(jsonObj)) {
            if (v !== undefined) params.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v))
          }
        } else {
          const bodyParams = new URLSearchParams(rawBody)
          bodyParams.forEach((v, k) => params.set(k, v))
        }
      } catch (e) {
        const bodyParams = new URLSearchParams(rawBody)
        bodyParams.forEach((v, k) => params.set(k, v))
      }
    }
  }

  const action = params.get('action') || ''
  const role = params.get('role')
  params.delete('role')

  const token = role === 'admin' ? ADMIN_TOKEN : role === 'user' ? DRIVER_TOKEN : (ADMIN_TOKEN || DRIVER_TOKEN || '')
  if (token) {
    params.set('apiToken', token)
  }

  try {
    let upstreamUrl = GOOGLE_SCRIPT_URL
    const requestOptions = {
      method: req.method === 'GET' ? 'GET' : 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      redirect: 'follow'
    }

    if (req.method === 'GET') {
      const u = new URL(GOOGLE_SCRIPT_URL)
      params.forEach((v, k) => u.searchParams.set(k, v))
      upstreamUrl = u.toString()
    } else {
      requestOptions.body = params.toString()
    }

    const upstream = await fetch(upstreamUrl, requestOptions)
    const body = await upstream.text()

    res.writeHead(upstream.status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    })
    res.end(body)
  } catch (err) {
    res.writeHead(502, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    })
    res.end(JSON.stringify({
      success: false,
      error: { code: 'PROXY_ERROR', message: `Gagal menghubungi Google Apps Script: ${err.message}` }
    }))
  }
}

function serveStatic(req, res) {
  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`)
  let pathname = parsedUrl.pathname

  if (pathname.startsWith('/api')) {
    return handleApiProxy(req, res)
  }

  let filePath = path.join(DIST_DIR, pathname)

  // SPA fallback: If requested file does not exist
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    const fileExt = path.extname(pathname).toLowerCase()
    // HTML / route requests fall back to index.html for client-side SPA routing
    if (!fileExt || fileExt === '.html') {
      filePath = path.join(DIST_DIR, 'index.html')
    } else {
      // Missing static asset -> serve custom 404.html
      const notFoundPath = path.join(DIST_DIR, '404.html')
      if (fs.existsSync(notFoundPath)) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' })
        return fs.createReadStream(notFoundPath).pipe(res)
      }
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      return res.end('404 Not Found')
    }
  }

  const ext = path.extname(filePath).toLowerCase()
  const contentType = MIME_TYPES[ext] || 'application/octet-stream'

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' })
      res.end('500 Internal Server Error')
      return
    }
    const isAsset = pathname.startsWith('/assets/')
    const cacheControl = isAsset ? 'public, max-age=31536000, immutable' : 'no-cache'
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': cacheControl
    })
    res.end(content)
  })
}

const server = http.createServer((req, res) => {
  serveStatic(req, res)
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 KPM Unified Web App running at http://localhost:${PORT}`)
  console.log(`📡 Google Apps Script Proxy configured -> ${GOOGLE_SCRIPT_URL}`)
})
