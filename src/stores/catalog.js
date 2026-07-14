import { defineStore } from 'pinia'
import { flatten } from '../Models/data'
import { usePrefsStore } from './prefs'

// ponytail: 全应用一份 rows；Tab 切换不再重复读盘/flatten
let inflight = null

export const useCatalogStore = defineStore('catalog', {
  state: () => ({
    rows: [],
    loading: false,
    error: '',
    loaded: false,
  }),
  actions: {
    async ensureLoaded() {
      if (this.loaded) return
      if (inflight) return inflight

      this.loading = true
      this.error = ''
      inflight = (async () => {
        try {
          if (!window.services?.getCatalog) {
            throw new Error('当前环境无数据服务（需在 uTools 中运行）')
          }
          const prefs = usePrefsStore()
          const catalog = await window.services.getCatalog(
            false,
            prefs.catalogTtlMs,
          )
          this.rows = flatten(catalog)
          this.loaded = true
        } catch (e) {
          this.error = e.message || String(e)
        } finally {
          this.loading = false
          inflight = null
        }
      })()
      return inflight
    },
  },
})
