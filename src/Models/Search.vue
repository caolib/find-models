<script setup>
import { computed, ref, watch, onMounted, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import {
  inputCost,
  outputCost,
  contextLimit,
  formatTokens,
  formatCost,
} from './data'
import Icon from './Icon.vue'
import Logo from './Logo.vue'
import { useUiStore } from '../stores/ui'
import { usePrefsStore } from '../stores/prefs'
import { useCatalogStore } from '../stores/catalog'
import './index.css'

const props = defineProps({
  enterAction: { type: Object, default: () => ({}) },
  selected: { type: Object, default: null },
})
const emit = defineEmits(['select', 'stats'])

const ui = useUiStore()
const prefs = usePrefsStore()
const catalog = useCatalogStore()
const {
  searchQuery: query,
  searchFilter: filter,
  searchSort: sort,
} = storeToRefs(ui)
const { pinnedProviders: pinned } = storeToRefs(prefs)
const { rows, loading, error, loaded } = storeToRefs(catalog)

const VISION_MODALITIES = ['image', 'video', 'audio', 'pdf']

function hasVision(row) {
  return row.modalities?.input?.some((m) => VISION_MODALITIES.includes(m))
}

function rowKey(r) {
  return r.providerId + '/' + r.id
}

const PAGE = 50
const limit = ref(PAGE)
const listEl = ref(null)
const showTop = ref(false)

watch(
  () => props.enterAction,
  (a) => {
    if (a?.type === 'over' && a?.payload)
      ui.setSearchQuery(String(a.payload).trim())
  },
  { immediate: true },
)

onMounted(() => {
  catalog.ensureLoaded()
})

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  let list = rows.value
  if (q) {
    list = list.filter(
      (r) =>
        r.id.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.family.toLowerCase().includes(q) ||
        r.providerName.toLowerCase().includes(q) ||
        r.providerId.toLowerCase().includes(q),
    )
  }
  const activeFt = Object.entries(filter.value)
    .filter(([, v]) => v)
    .map(([k]) => k)
  if (activeFt.length) {
    list = list.filter((r) =>
      activeFt.every((k) => (k === 'vision' ? hasVision(r) : r[k])),
    )
  }

  const sorted = [...list]
  switch (sort.value) {
    case 'cost':
      sorted.sort((a, b) => (inputCost(a) ?? 1e9) - (inputCost(b) ?? 1e9))
      break
    case 'context':
      sorted.sort((a, b) => (contextLimit(b) ?? 0) - (contextLimit(a) ?? 0))
      break
    case 'name':
      sorted.sort((a, b) => a.name.localeCompare(b.name))
      break
    case 'updated':
    default:
      sorted.sort((a, b) =>
        (b.last_updated || '').localeCompare(a.last_updated || ''),
      )
      break
  }
  // ponytail: 搜索时置顶供应商卡片置顶，组内保持原排序（稳定分区）
  if (q) {
    sorted.sort(
      (a, b) =>
        (pinned.value.includes(b.providerId) ? 1 : 0) -
        (pinned.value.includes(a.providerId) ? 1 : 0),
    )
  }
  return sorted
})

watch([query, filter, sort], () => {
  limit.value = PAGE
  showTop.value = false
  nextTick(() => {
    if (listEl.value) listEl.value.scrollTop = 0
  })
})

const total = computed(() => filtered.value.length)
const pageItems = computed(() => filtered.value.slice(0, limit.value))
const shown = computed(() => pageItems.value.length)
const hasMore = computed(() => shown.value < total.value)

watch(
  [shown, total, () => rows.value.length, loading, error],
  () => {
    emit('stats', {
      shown: shown.value,
      total: total.value,
      all: rows.value.length,
      loading: loading.value,
      error: error.value,
    })
  },
  { immediate: true },
)

function loadMore() {
  if (!hasMore.value) return
  limit.value += PAGE
  nextTick(() => {
    const el = listEl.value
    if (!el || !hasMore.value) return
    if (el.scrollHeight <= el.clientHeight + 160) loadMore()
  })
}

function onListScroll() {
  const el = listEl.value
  if (!el) return
  showTop.value = el.scrollTop > 240
  if (!hasMore.value) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 160) loadMore()
}

function scrollToTop() {
  listEl.value?.scrollTo({ top: 0, behavior: 'smooth' })
}

function retry() {
  window.services.getCatalog(true).then(() => location.reload())
}

function onRowKey(e, r) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    emit('select', r)
  }
}
</script>

<template>
  <div v-if="loading || !loaded" class="state-wrap">
    <div class="spinner" />
    <div class="big">加载模型数据中…</div>
  </div>
  <div v-else-if="error" class="state-wrap state-error">
    <Icon name="x" :size="22" />
    <div class="big">数据加载失败</div>
    <div style="font-size: 11px">{{ error }}</div>
    <button type="button" @click="retry">重试</button>
  </div>
  <div v-else class="search-view">
    <div
      ref="listEl"
      class="scroll-list cards"
      role="listbox"
      aria-label="模型列表"
      @scroll.passive="onListScroll"
    >
      <div
        v-for="r in pageItems"
        :key="rowKey(r)"
        role="option"
        :aria-selected="!!(selected && rowKey(selected) === rowKey(r))"
        tabindex="0"
        :class="[
          'model-card',
          {
            on: selected && rowKey(selected) === rowKey(r),
            pinned: query.trim() && pinned.includes(r.providerId),
          },
        ]"
        @click="emit('select', r)"
        @keydown="onRowKey($event, r)"
      >
        <div class="model-card-head">
          <Logo :id="r.providerId" :name="r.providerName" :size="26" />
          <div class="model-card-top">
            <div class="row-name">
              <span class="name-text" :title="r.name">{{ r.name }}</span>
              <span v-if="r.status" :class="['tag-status', r.status]">{{
                r.status
              }}</span>
            </div>
            <div class="row-sub">
              <span class="provider">{{ r.providerName }}</span>
              <span class="sep">·</span>
              <span class="id" :title="r.id">{{ r.id }}</span>
            </div>
          </div>
        </div>
        <div class="model-card-meta">
          <span class="ctx" title="上下文窗口">{{
            formatTokens(contextLimit(r))
          }}</span>
          <span class="col-price" title="输入 / 输出 · 每百万 token USD">
            <span
              v-if="inputCost(r) != null || outputCost(r) != null"
              class="price-pair"
            >
              <span class="price-in">{{ formatCost(inputCost(r)) }}</span>
              <span class="price-sep">/</span>
              <span class="price-out">{{ formatCost(outputCost(r)) }}</span>
            </span>
            <span v-else class="price-none">—</span>
          </span>
        </div>
        <div class="col-feats">
          <span v-if="r.reasoning" class="badge reason">推理</span>
          <span v-if="r.tool_call" class="badge tool">工具</span>
          <span v-if="hasVision(r)" class="badge vision">多模态</span>
          <span v-if="r.open_weights" class="badge open">开源</span>
        </div>
      </div>
      <div v-if="pageItems.length === 0" class="list-empty">
        未匹配到模型，换个关键词试试
      </div>
      <div class="scroll-sentinel">
        <button
          v-if="hasMore"
          type="button"
          class="scroll-more-btn"
          @click="loadMore"
        >
          加载更多（{{ shown }} / {{ total }}）
        </button>
        <span v-else-if="total > 0" class="scroll-end">已全部显示</span>
      </div>
    </div>

    <button
      v-show="showTop"
      type="button"
      class="back-top"
      title="回到顶部"
      aria-label="回到顶部"
      @click="scrollToTop"
    >
      <Icon name="up" :size="16" />
    </button>
  </div>
</template>
