// ponytail: uTools 用 dbStorage，浏览器 dev 回落 localStorage
export const appStorage = {
  getItem (key) {
    try {
      if (window.utools?.dbStorage) {
        const v = window.utools.dbStorage.getItem(key)
        if (v == null) return migrateLegacy(key)
        return typeof v === 'string' ? v : JSON.stringify(v)
      }
      return localStorage.getItem(key) ?? migrateLegacy(key)
    } catch {
      return null
    }
  },
  setItem (key, value) {
    try {
      if (window.utools?.dbStorage) {
        window.utools.dbStorage.setItem(key, value)
        return
      }
      localStorage.setItem(key, value)
    } catch {}
  }
}

// 一次性迁移旧 pinnedProviders
function migrateLegacy (key) {
  if (key !== 'modelsdev.prefs') return null
  try {
    let pinned = []
    if (window.utools?.dbStorage) {
      const v = window.utools.dbStorage.getItem('pinnedProviders')
      if (Array.isArray(v)) pinned = v
    } else {
      const raw = localStorage.getItem('modelsdev.pinnedProviders')
      if (raw) pinned = JSON.parse(raw)
    }
    if (!Array.isArray(pinned) || !pinned.length) return null
    return JSON.stringify({ tab: 'search', pinnedProviders: pinned })
  } catch {
    return null
  }
}
