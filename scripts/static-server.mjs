import http from 'node:http'
import { createReadStream, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const repoRoot = path.resolve(__dirname, '..')
const port = Number.parseInt(process.argv[2] ?? '8080', 10)

if (!Number.isFinite(port) || port <= 0) {
  // eslint-disable-next-line no-console
  console.error('Usage: node scripts/static-server.mjs [port]')
  process.exit(1)
}

const contentTypeByExt = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'],
  ['.ico', 'image/x-icon'],
  ['.txt', 'text/plain; charset=utf-8'],
])

function send(res, statusCode, body, headers = {}) {
  res.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    ...headers,
  })
  res.end(body)
}

function safeResolve(root, urlPathname) {
  const decoded = decodeURIComponent(urlPathname)
  const withoutQuery = decoded.split('?')[0]
  const normalized = path.posix.normalize(withoutQuery)
  const withoutLeadingSlash = normalized.replace(/^\/+/, '')
  const resolved = path.resolve(root, withoutLeadingSlash)
  if (!resolved.startsWith(root + path.sep) && resolved !== root) return null
  return resolved
}

const server = http.createServer((req, res) => {
  if (!req.url) return send(res, 400, 'Bad Request')
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method Not Allowed')

  const urlObj = new URL(req.url, 'http://localhost')
  let filePath = safeResolve(repoRoot, urlObj.pathname)
  if (!filePath) return send(res, 403, 'Forbidden')

  try {
    const stat = statSync(filePath)
    if (stat.isDirectory()) filePath = path.join(filePath, 'index.html')
  } catch {
    // continue; handled below
  }

  let stat
  try {
    stat = statSync(filePath)
  } catch {
    return send(res, 404, 'Not Found')
  }

  if (!stat.isFile()) return send(res, 404, 'Not Found')

  const ext = path.extname(filePath).toLowerCase()
  const contentType = contentTypeByExt.get(ext) ?? 'application/octet-stream'

  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': stat.size,
    'Cache-Control': 'no-store',
  })
  if (req.method === 'HEAD') return res.end()

  createReadStream(filePath).pipe(res)
})

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Static server running: http://localhost:${port}/ (root: ${repoRoot})`)
})

