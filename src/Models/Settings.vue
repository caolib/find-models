<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { usePrefsStore, DEFAULT_FONT } from '../stores/prefs'
import './settings.css'

const THEME_OPTIONS = [
  { id: 'system', label: '系统' },
  { id: 'light', label: '浅色' },
  { id: 'dark', label: '深色' },
]

const prefs = usePrefsStore()
const { fontFamily, theme, catalogTtlMinutes } = storeToRefs(prefs)
const fontDraft = ref(fontFamily.value || DEFAULT_FONT)
const ttlDraft = ref(String(catalogTtlMinutes.value ?? 180))

const info = ref({ ts: null, ageMs: Infinity, hasCache: false })
const refreshing = ref(false)
const refreshErr = ref('')

watch(fontFamily, (v) => {
  if (v !== fontDraft.value) fontDraft.value = v
})
watch(catalogTtlMinutes, (v) => {
  ttlDraft.value = String(v ?? 180)
})

function commitFont() {
  prefs.setFontFamily(fontDraft.value)
  fontDraft.value = prefs.fontFamily
}

function onFontKey(e) {
  if (e.key === 'Enter') {
    e.preventDefault()
    commitFont()
  }
}

function commitTtl() {
  prefs.setCatalogTtlMinutes(ttlDraft.value)
  ttlDraft.value = String(prefs.catalogTtlMinutes)
}

function onTtlKey(e) {
  if (e.key === 'Enter') {
    e.preventDefault()
    commitTtl()
  }
}

function openUrl(u) {
  window.utools?.shellOpenExternal?.(u) || window.open(u, '_blank')
}

function loadInfo() {
  try {
    info.value = window.services?.catalogInfo?.() || {
      ts: null,
      ageMs: Infinity,
      hasCache: false,
    }
  } catch {
    info.value = { ts: null, ageMs: Infinity, hasCache: false }
  }
}

const updatedText = computed(() => {
  const ts = info.value.ts
  if (!ts) return '尚无本地缓存'
  try {
    return new Date(ts).toLocaleString()
  } catch {
    return String(ts)
  }
})

const ageText = computed(() => {
  const age = info.value.ageMs
  if (!Number.isFinite(age) || !info.value.hasCache) return '—'
  const m = Math.floor(age / 60000)
  if (m < 1) return '不到 1 分钟'
  if (m < 60) return `${m} 分钟前`
  const h = Math.floor(m / 60)
  if (h < 48) return `${h} 小时前`
  return `${Math.floor(h / 24)} 天前`
})

async function refreshCatalog() {
  if (!window.services?.getCatalog) {
    refreshErr.value = '当前环境无数据服务（需在 uTools 中运行）'
    return
  }
  refreshing.value = true
  refreshErr.value = ''
  try {
    await window.services.getCatalog(true)
    loadInfo()
    // 让搜索/供应商页重新读盘
    location.reload()
  } catch (e) {
    refreshErr.value = e.message || String(e)
    refreshing.value = false
  }
}

onMounted(loadInfo)
</script>

<template>
  <div class="settings-view">
    <div class="settings-card">
      <h2 class="settings-title">外观</h2>

      <label class="settings-field">
        <span class="settings-label">全局字体</span>
        <input
          class="settings-input"
          type="text"
          v-model="fontDraft"
          spellcheck="false"
          placeholder="CSS font-family，如 Microsoft YaHei, sans-serif"
          aria-label="全局字体"
          @blur="commitFont"
          @keydown="onFontKey"
        />
      </label>
      <div
        class="settings-preview"
        :style="{ fontFamily: fontFamily || DEFAULT_FONT }"
      >
        预览 Aa 中文 0123 · gpt-5 / claude
      </div>

      <div class="settings-field" style="margin-top: 18px">
        <span class="settings-label">主题</span>
        <div class="theme-seg" role="radiogroup" aria-label="主题">
          <button
            v-for="t in THEME_OPTIONS"
            :key="t.id"
            type="button"
            role="radio"
            :aria-checked="theme === t.id"
            :class="['theme-seg-btn', { on: theme === t.id }]"
            @click="prefs.setTheme(t.id)"
          >
            {{ t.label }}
          </button>
        </div>
      </div>
    </div>

    <div class="settings-card">
      <h2 class="settings-title">数据缓存</h2>

      <label class="settings-field">
        <span class="settings-label">过期时间（分钟）</span>
        <input
          class="settings-input"
          type="number"
          min="0"
          max="10080"
          step="1"
          v-model="ttlDraft"
          aria-label="缓存过期时间（分钟）"
          @blur="commitTtl"
          @keydown="onTtlKey"
        />
      </label>

      <div class="settings-kv">
        <div class="settings-kv-row">
          <span class="k">上次更新</span>
          <span class="v mono">{{ updatedText }}</span>
        </div>
        <div class="settings-kv-row">
          <span class="k">距今</span>
          <span class="v">{{ ageText }}</span>
        </div>
      </div>

      <div class="settings-actions">
        <button
          type="button"
          class="settings-link-btn"
          :disabled="refreshing"
          @click="refreshCatalog"
        >
          {{ refreshing ? '更新中…' : '立即更新数据' }}
        </button>
      </div>
      <p v-if="refreshErr" class="settings-err">{{ refreshErr }}</p>
    </div>

    <div class="settings-card settings-about">
      <h2 class="settings-title">数据来源</h2>
      <p class="settings-about-text">
        项目数据来自
        <a
          href="https://models.dev/"
          class="settings-link"
          @click.prevent="openUrl('https://models.dev/')"
          >models.dev</a
        >
        — An open-source database of AI models.
      </p>
      <a
        href="https://models.dev/"
        class="settings-link-btn"
        @click.prevent="openUrl('https://models.dev/')"
      >
        打开 models.dev ↗
      </a>
    </div>
  </div>
</template>
