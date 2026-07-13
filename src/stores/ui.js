import { defineStore } from 'pinia'

// 顶栏共享 UI 状态（不持久化）
export const useUiStore = defineStore('ui', {
  state: () => ({
    searchQuery: '',
    searchFilter: {},
    searchSort: 'updated',
    providerModelQ: ''
  }),
  actions: {
    setSearchQuery (q) {
      this.searchQuery = String(q ?? '')
    },
    toggleFilter (k) {
      this.searchFilter = { ...this.searchFilter, [k]: !this.searchFilter[k] }
    },
    setSort (v) {
      this.searchSort = v
    },
    setProviderModelQ (q) {
      this.providerModelQ = String(q ?? '')
    },
    clearProviderModelQ () {
      this.providerModelQ = ''
    }
  }
})
