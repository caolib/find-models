<script setup>
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { usePrefsStore, DEFAULT_FONT } from '../stores/prefs'
import './settings.css'

const THEME_OPTIONS = [
  { id: 'system', label: '系统' },
  { id: 'light', label: '浅色' },
  { id: 'dark', label: '深色' }
]

const prefs = usePrefsStore()
const { fontFamily, theme } = storeToRefs(prefs)
const fontDraft = ref(fontFamily.value || DEFAULT_FONT)

watch(fontFamily, (v) => {
  if (v !== fontDraft.value) fontDraft.value = v
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

function openUrl(u) {
  window.utools?.shellOpenExternal?.(u) || window.open(u, '_blank')
}
</script>

<template>
  <div class="settings-view">
    <div class="settings-card">
      <h2 class="settings-title">外观</h2>

      <label class="settings-field">
        <span class="settings-label">全局字体</span>
        <input class="settings-input" type="text" v-model="fontDraft" spellcheck="false"
          placeholder="CSS font-family，如 Microsoft YaHei, sans-serif" aria-label="全局字体" @blur="commitFont"
          @keydown="onFontKey">
      </label>
      <div class="settings-preview" :style="{ fontFamily: fontFamily || DEFAULT_FONT }">
        预览 Aa 中文 0123 · gpt-5 / claude
      </div>

      <div class="settings-field" style="margin-top: 18px">
        <span class="settings-label">主题</span>
        <div class="theme-seg" role="radiogroup" aria-label="主题">
          <button v-for="t in THEME_OPTIONS" :key="t.id" type="button" role="radio" :aria-checked="theme === t.id"
            :class="['theme-seg-btn', { on: theme === t.id }]" @click="prefs.setTheme(t.id)">
            {{ t.label }}
          </button>
        </div>
      </div>
    </div>

    <div class="settings-card settings-about">
      <h2 class="settings-title">数据来源</h2>
      <p class="settings-about-text">
        项目数据来自
        <a href="https://models.dev/" class="settings-link" @click.prevent="openUrl('https://models.dev/')">models.dev</a>
        — An open-source database of AI models.
      </p>
      <a href="https://models.dev/" class="settings-link-btn" @click.prevent="openUrl('https://models.dev/')">
        打开 models.dev ↗
      </a>
    </div>
  </div>
</template>
