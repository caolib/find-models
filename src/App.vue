<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import Search from './Models/Search.vue'
import Detail from './Models/Detail.vue'
import Providers from './Models/Providers.vue'
import Settings from './Models/Settings.vue'
import Icon from './Models/Icon.vue'
import {
  usePrefsStore,
  applyFontFamily,
  applyTheme,
  bindSystemTheme,
  unbindSystemTheme,
  normalizeFont,
} from './stores/prefs'
import { useUiStore } from './stores/ui'
import './Models/app.css'
import './Models/index.css'

const enterAction = ref({})
const selected = ref(null)
const searchStats = ref({ shown: 0, total: 0, all: 0 })
const providerStats = ref({ shown: 0, total: 0, name: '' })
const searchInputEl = ref(null)
const providerInputEl = ref(null)

const prefs = usePrefsStore()
const ui = useUiStore()
const { tab, fontFamily, theme } = storeToRefs(prefs)
const { searchQuery, searchSort, providerModelQ } = storeToRefs(ui)

const tabView = computed(() => {
  if (tab.value === 'settings') return Settings
  if (tab.value === 'providers') return Providers
  return Search
})

// 迁移旧 font id，并同步 DOM
prefs.$patch({ fontFamily: normalizeFont(prefs.fontFamily) })
if (!['system', 'light', 'dark'].includes(prefs.theme)) prefs.theme = 'system'

function focusTabSearch() {
  nextTick(() => {
    const el =
      tab.value === 'search'
        ? searchInputEl.value
        : tab.value === 'providers'
          ? providerInputEl.value
          : null
    el?.focus()
  })
}

function onPanelStats(e) {
  if (tab.value === 'providers') providerStats.value = e
  else searchStats.value = e
}

// ponytail: 输入防抖 200ms，避免逐字重算 filtered；enterAction/清除走即时路径
let debounceTimer
function debounce(fn, ms = 200) {
  return (...args) => {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => fn(...args), ms)
  }
}
const debouncedSetSearchQuery = debounce((v) => ui.setSearchQuery(v))
const debouncedSetProviderModelQ = debounce((v) => ui.setProviderModelQ(v))

watch(fontFamily, (v) => applyFontFamily(v), { immediate: true })
watch(theme, (v) => applyTheme(v), { immediate: true })
watch(tab, focusTabSearch, { immediate: true })
bindSystemTheme(() => prefs.theme)
onUnmounted(unbindSystemTheme)

onMounted(() => {
  // ponytail: dev 浏览器无 utools 注入，守卫一下避免崩；uTools 运行时才注册
  const u = window.utools
  if (!u) return
  u.onPluginEnter((action) => {
    enterAction.value = action
    selected.value = null
    if (prefs.theme === 'system') applyTheme('system')
    focusTabSearch()
  })
  u.onPluginOut(() => {
    enterAction.value = {}
    selected.value = null
  })
})

function select(row) {
  selected.value = row
}
function close() {
  selected.value = null
}
</script>

<template>
  <div class="app-shell">
    <div class="app-main">
      <header class="app-header">
        <div class="app-header-row">
          <div class="app-tabs">
            <button
              type="button"
              :class="['app-tab', { on: tab === 'search' }]"
              @click="prefs.setTab('search')"
            >
              搜索
            </button>
            <button
              type="button"
              :class="['app-tab', { on: tab === 'providers' }]"
              @click="prefs.setTab('providers')"
            >
              供应商
            </button>
            <button
              type="button"
              :class="['app-tab', { on: tab === 'settings' }]"
              @click="prefs.setTab('settings')"
            >
              设置
            </button>
          </div>

          <div v-if="tab === 'search'" class="app-toolbar">
            <div class="search-field app-search-field">
              <input
                ref="searchInputEl"
                class="search-input"
                type="search"
                :value="searchQuery"
                placeholder="搜索 模型 / 供应商 / family"
                aria-label="搜索模型"
                @input="debouncedSetSearchQuery($event.target.value)"
              />
              <button
                v-if="searchQuery"
                type="button"
                class="search-clear"
                title="清除"
                aria-label="清除"
                @click="ui.setSearchQuery('')"
              >
                <Icon name="x" :size="12" />
              </button>
            </div>
            <select
              class="sort-select"
              :value="searchSort"
              title="排序方式"
              aria-label="排序方式"
              @change="ui.setSort($event.target.value)"
            >
              <option value="updated">按更新时间</option>
              <option value="cost">按输入价格</option>
              <option value="context">按上下文</option>
              <option value="name">按名称</option>
            </select>
            <span class="app-meta">
              <template v-if="searchStats.total === 0">无结果</template>
              <template v-else>
                <b>{{ searchStats.shown }}</b> / {{ searchStats.total }}
              </template>
            </span>
          </div>

          <div
            v-else-if="tab === 'providers'"
            class="app-toolbar app-toolbar-prov"
          >
            <div class="search-field app-search-field">
              <input
                ref="providerInputEl"
                class="search-input"
                type="search"
                :value="providerModelQ"
                placeholder="搜索当前供应商模型…"
                aria-label="搜索当前供应商模型"
                @input="debouncedSetProviderModelQ($event.target.value)"
              />
              <button
                v-if="providerModelQ"
                type="button"
                class="search-clear"
                title="清除"
                aria-label="清除"
                @click="ui.clearProviderModelQ()"
              >
                <Icon name="x" :size="12" />
              </button>
            </div>
            <span class="app-meta">
              <template v-if="providerStats.total">
                <b>{{ providerStats.shown }}</b> / {{ providerStats.total }}
              </template>
              <template v-else>选择供应商</template>
            </span>
          </div>
        </div>
      </header>

      <div class="app-panel">
        <!-- KeepAlive：切 Tab 不销毁，避免重挂载 + 重 flatten/重渲染 -->
        <KeepAlive>
          <component
            :is="tabView"
            :key="tab"
            :enter-action="enterAction"
            :selected="selected"
            @select="select"
            @stats="onPanelStats"
          />
        </KeepAlive>
      </div>
    </div>
    <aside v-if="selected && tab !== 'settings'" class="app-side">
      <Detail :row="selected" @close="close" />
    </aside>
  </div>
</template>
