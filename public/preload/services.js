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

window.services = {
  // 拉取并缓存 catalog.json，返回 { models, providers, ts }
  async getCatalog (force = false) {
    if (!force) {
      const cached = readCatalogFile()
      if (cached) return cached
    }
    fs.mkdirSync(DATA_DIR, { recursive: true })
    const raw = await fetchText(CATALOG_URL)
    const catalog = JSON.parse(raw)
    const data = { models: catalog.models || {}, providers: catalog.providers || {}, ts: Date.now() }
    fs.writeFileSync(CATALOG_FILE, JSON.stringify(data), 'utf8')
    return data
  },

  catalogAgeMs () {
    try {
      const st = fs.statSync(CATALOG_FILE)
      return Date.now() - st.mtimeMs
    } catch {
      return Infinity
    }
  },

  // 取厂商 logo 本地路径，缺则下载落地
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

  // 取本地已缓存的 logo 路径（不下载）
  providerLogoPath (providerId) {
    const file = path.join(LOGO_DIR, `${providerId}.svg`)
    return fs.existsSync(file) ? file : null
  },

  copyText (text) { window.utools.copyText(text) },

  // ponytail: 厂商置顶 id 列表，uTools dbStorage 持久化；浏览器 dev 回落 localStorage
  getPinnedProviders () {
    try {
      if (window.utools?.dbStorage) {
        const v = window.utools.dbStorage.getItem('pinnedProviders')
        return Array.isArray(v) ? v : []
      }
      const raw = localStorage.getItem('modelsdev.pinnedProviders')
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  },

  setPinnedProviders (ids) {
    const list = Array.isArray(ids) ? ids.filter(Boolean) : []
    try {
      if (window.utools?.dbStorage) {
        window.utools.dbStorage.setItem('pinnedProviders', list)
        return
      }
      localStorage.setItem('modelsdev.pinnedProviders', JSON.stringify(list))
    } catch {}
  }
}
