<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'
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
  normalizeFont
} from './stores/prefs'
import { useUiStore } from './stores/ui'
import './Models/app.css'
import './Models/index.css'

const enterAction = ref({})
const selected = ref(null)
const searchStats = ref({ shown: 0, total: 0, all: 0 })
const providerStats = ref({ shown: 0, total: 0, name: '' })

const prefs = usePrefsStore()
const ui = useUiStore()
const { tab, fontFamily, theme } = storeToRefs(prefs)
const { searchQuery, searchSort, providerModelQ } = storeToRefs(ui)

// 迁移旧 font id，并同步 DOM
prefs.$patch({ fontFamily: normalizeFont(prefs.fontFamily) })
if (!['system', 'light', 'dark'].includes(prefs.theme)) prefs.theme = 'system'

watch(fontFamily, (v) => applyFontFamily(v), { immediate: true })
watch(theme, (v) => applyTheme(v), { immediate: true })
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
  })
  u.onPluginOut(() => {
    enterAction.value = {}
    selected.value = null
  })
})

function select (row) {
  selected.value = row
}
function close () {
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
                class="search-input"
                type="search"
                autofocus
                :value="searchQuery"
                placeholder="搜索 模型 / 供应商 / family"
                aria-label="搜索模型"
                @input="ui.setSearchQuery($event.target.value)"
              >
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

          <div v-else-if="tab === 'providers'" class="app-toolbar app-toolbar-prov">
            <div class="search-field app-search-field">
              <input
                class="search-input"
                type="search"
                :value="providerModelQ"
                placeholder="搜索当前供应商模型…"
                aria-label="搜索当前供应商模型"
                @input="ui.setProviderModelQ($event.target.value)"
              >
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
        <Settings v-if="tab === 'settings'" />
        <Providers
          v-else-if="tab === 'providers'"
          :selected="selected"
          @select="select"
          @stats="providerStats = $event"
        />
        <Search
          v-else
          :enter-action="enterAction"
          :selected="selected"
          @select="select"
          @stats="searchStats = $event"
        />
      </div>
    </div>
    <aside v-if="selected && tab !== 'settings'" class="app-side">
      <Detail :row="selected" @close="close" />
    </aside>
  </div>
</template>
