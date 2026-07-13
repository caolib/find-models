import { defineStore } from 'pinia'
import { appStorage } from './storage'

const TABS = new Set(['search', 'providers', 'settings'])
const THEMES = new Set(['system', 'light', 'dark'])

// 与 main.css 里 --font-mono 默认一致
export const DEFAULT_FONT =
  "'JetBrains Mono', 'Cascadia Code', 汉仪有圆, Anthropicons-Variable, kanzhun-mix, FontAwesome, system-ui, sans-serif"

// 旧版 id → stack（persist 迁移用一次）
const LEGACY_FONTS = {
  default: DEFAULT_FONT,
  system: "system-ui, -apple-system, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
  sans: "'Segoe UI', 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif",
  mono: "'JetBrains Mono', 'Cascadia Code', Consolas, 'Courier New', monospace",
  yahei: "'Microsoft YaHei', 'PingFang SC', system-ui, sans-serif"
}

export function normalizeFont (v) {
  if (typeof v !== 'string') return DEFAULT_FONT
  const s = v.trim()
  if (!s) return DEFAULT_FONT
  if (LEGACY_FONTS[s]) return LEGACY_FONTS[s]
  return s
}

export function applyFontFamily (font) {
  document.documentElement.style.setProperty('--font-mono', normalizeFont(font))
}

function systemIsDark () {
  // uTools: isDarkColors()；文档更推荐 matchMedia 可监听
  try {
    if (window.utools?.isDarkColors) return !!window.utools.isDarkColors()
  } catch {}
  return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false
}

export function resolveTheme (mode) {
  if (mode === 'dark') return 'dark'
  if (mode === 'light') return 'light'
  return systemIsDark() ? 'dark' : 'light'
}

export function applyTheme (mode) {
  const resolved = resolveTheme(mode)
  document.documentElement.dataset.theme = resolved
  document.documentElement.style.colorScheme = resolved
  return resolved
}

let mql = null
let mqlHandler = null

export function bindSystemTheme (getMode) {
  unbindSystemTheme()
  if (!window.matchMedia) return
  mql = window.matchMedia('(prefers-color-scheme: dark)')
  mqlHandler = () => {
    if (getMode() === 'system') applyTheme('system')
  }
  mql.addEventListener?.('change', mqlHandler)
}

export function unbindSystemTheme () {
  if (mql && mqlHandler) mql.removeEventListener?.('change', mqlHandler)
  mql = null
  mqlHandler = null
}

export const usePrefsStore = defineStore('prefs', {
  state: () => ({
    tab: 'search',
    pinnedProviders: [],
    fontFamily: DEFAULT_FONT,
    theme: 'system'
  }),
  actions: {
    setTab (tab) {
      if (TABS.has(tab)) this.tab = tab
    },
    setFontFamily (font) {
      this.fontFamily = normalizeFont(font)
      applyFontFamily(this.fontFamily)
    },
    setTheme (mode) {
      if (!THEMES.has(mode)) return
      this.theme = mode
      applyTheme(mode)
    },
    togglePin (id) {
      if (!id) return
      const i = this.pinnedProviders.indexOf(id)
      if (i >= 0) this.pinnedProviders.splice(i, 1)
      else this.pinnedProviders.push(id)
    },
    isPinned (id) {
      return this.pinnedProviders.includes(id)
    }
  },
  persist: {
    key: 'modelsdev.prefs',
    storage: appStorage,
    pick: ['tab', 'pinnedProviders', 'fontFamily', 'theme']
  }
})
