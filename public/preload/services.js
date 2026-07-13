const fs = require('node:fs')
const path = require('node:path')
const https = require('node:https')

const API_BASE = 'https://models.dev'
const CATALOG_URL = `${API_BASE}/catalog.json`
const DATA_DIR = path.join(window.utools.getPath('userData'), 'modelsdev-data')
const CATALOG_FILE = path.join(DATA_DIR, 'catalog.json')
const LOGO_DIR = path.join(DATA_DIR, 'logos')

// ponytail: 直接用 node:https 拉数据，不引入 axios
function fetchText (url, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchText(res.headers.location, timeout).then(resolve, reject)
      }
      if (res.statusCode !== 200) {
        res.resume()
        return reject(new Error(`HTTP ${res.statusCode}`))
      }
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    })
    req.on('timeout', () => req.destroy(new Error('timeout')))
    req.on('error', reject)
  })
}

function fetchBuffer (url, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchBuffer(res.headers.location, timeout).then(resolve, reject)
      }
      if (res.statusCode !== 200) {
        res.resume()
        return reject(new Error(`HTTP ${res.statusCode}`))
      }
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks)))
    })
    req.on('timeout', () => req.destroy(new Error('timeout')))
    req.on('error', reject)
  })
}

// ponytail: catalog.json 3.3MB 超出 utools.dbStorage 1M 上限，直接落本地文件
function readCatalogFile () {
  try {
    const raw = fs.readFileSync(CATALOG_FILE, 'utf8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

let refreshInflight = null

window.services = {
  // 拉取并缓存 catalog.json，返回 { models, providers, ts }
  // force: 强制网络刷新；maxAgeMs: 过期阈值
  // 有缓存 → 立刻返回；已过期则后台静默刷新（不阻塞）
  async getCatalog (force = false, maxAgeMs = null) {
    if (force) return fetchAndWriteCatalog()

    const cached = readCatalogFile()
    if (cached) {
      const age = catalogAgeFrom(cached)
      const expired = maxAgeMs != null && age >= maxAgeMs
      if (expired) scheduleBackgroundRefresh()
      return cached
    }

    // 无缓存才阻塞等待网络
    return fetchAndWriteCatalog()
  },

  catalogAgeMs () {
    const cached = readCatalogFile()
    if (!cached) return Infinity
    return catalogAgeFrom(cached)
  },

  catalogInfo () {
    const cached = readCatalogFile()
    if (!cached) {
      return { ts: null, ageMs: Infinity, hasCache: false }
    }
    const ageMs = catalogAgeFrom(cached)
    return {
      ts: cached.ts || (Date.now() - ageMs),
      ageMs,
      hasCache: true
    }
  },

  async getProviderLogo (providerId) {
    try { fs.mkdirSync(LOGO_DIR, { recursive: true }) } catch {}
    const file = path.join(LOGO_DIR, `${providerId}.svg`)
    if (fs.existsSync(file)) return file
    try {
      const buf = await fetchBuffer(`${API_BASE}/logos/${providerId}.svg`)
      fs.writeFileSync(file, buf)
      return file
    } catch {
      return null
    }
  },

  providerLogoPath (providerId) {
    const file = path.join(LOGO_DIR, `${providerId}.svg`)
    return fs.existsSync(file) ? file : null
  },

  copyText (text) { window.utools.copyText(text) }
}

function catalogAgeFrom (cached) {
  if (cached && typeof cached.ts === 'number') return Math.max(0, Date.now() - cached.ts)
  try {
    const st = fs.statSync(CATALOG_FILE)
    return Math.max(0, Date.now() - st.mtimeMs)
  } catch {
    return Infinity
  }
}

async function fetchAndWriteCatalog () {
  if (refreshInflight) return refreshInflight
  refreshInflight = (async () => {
    fs.mkdirSync(DATA_DIR, { recursive: true })
    const raw = await fetchText(CATALOG_URL)
    const catalog = JSON.parse(raw)
    const data = { models: catalog.models || {}, providers: catalog.providers || {}, ts: Date.now() }
    fs.writeFileSync(CATALOG_FILE, JSON.stringify(data), 'utf8')
    return data
  })().finally(() => { refreshInflight = null })
  return refreshInflight
}

// ponytail: 后台刷新失败静默，下次再试
function scheduleBackgroundRefresh () {
  if (refreshInflight) return
  fetchAndWriteCatalog().catch(() => {})
}
