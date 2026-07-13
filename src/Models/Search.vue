<script setup>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import {
  flatten, featuresList, inputCost, outputCost, contextLimit,
  formatTokens, formatCost
} from './data'
import Icon from './Icon.vue'
import Logo from './Logo.vue'
import './index.css'

const props = defineProps({
  enterAction: { type: Object, default: () => ({}) },
  selected: { type: Object, default: null }
})
const emit = defineEmits(['select'])

const VISION_MODALITIES = ['image', 'video', 'audio', 'pdf']

function hasVision (row) {
  return row.modalities?.input?.some((m) => VISION_MODALITIES.includes(m))
}

function rowKey (r) {
  return r.providerId + '/' + r.id
}

const rows = ref([])
const loading = ref(true)
const error = ref('')
const query = ref('')
const filter = ref({})
const sort = ref('updated')
const PAGE = 50
const page = ref(1)

let alive = true
onUnmounted(() => { alive = false })

watch(
  () => props.enterAction,
  (a) => {
    if (a?.type === 'over' && a?.payload) query.value = String(a.payload).trim()
  },
  { immediate: true }
)

onMounted(async () => {
  try {
    const catalog = await window.services.getCatalog()
    if (!alive) return
    rows.value = flatten(catalog)
    loading.value = false
  } catch (e) {
    if (!alive) return
    error.value = e.message || String(e)
    loading.value = false
  }
})

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  let list = rows.value
  if (q) {
    list = list.filter((r) =>
      r.id.toLowerCase().includes(q) ||
      r.name.toLowerCase().includes(q) ||
      r.family.toLowerCase().includes(q) ||
      r.providerName.toLowerCase().includes(q) ||
      r.providerId.toLowerCase().includes(q)
    )
  }
  const activeFt = Object.entries(filter.value).filter(([, v]) => v).map(([k]) => k)
  if (activeFt.length) {
    list = list.filter((r) => activeFt.every((k) => (k === 'vision' ? hasVision(r) : r[k])))
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
      sorted.sort((a, b) => (b.last_updated || '').localeCompare(a.last_updated || ''))
      break
  }
  return sorted
})

watch([query, filter, sort], () => { page.value = 1 })

const total = computed(() => filtered.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE)))
const pageItems = computed(() => filtered.value.slice((page.value - 1) * PAGE, page.value * PAGE))
const from = computed(() => total.value === 0 ? 0 : (page.value - 1) * PAGE + 1)
const to = computed(() => Math.min(page.value * PAGE, total.value))

function toggle (k) {
  filter.value = { ...filter.value, [k]: !filter.value[k] }
}

function retry () {
  window.services.getCatalog(true).then(() => location.reload())
}

function onRowKey (e, r) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    emit('select', r)
  }
}
</script>

<template>
  <div v-if="loading" class="state-wrap">
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
    <div class="topbar">
      <input
        class="search-input"
        autofocus
        v-model="query"
        placeholder="搜索 模型 / 厂商 / family   例: gpt-5, claude, glm"
        aria-label="搜索模型"
      >
      <select
        class="sort-select"
        v-model="sort"
        title="排序方式"
        aria-label="排序方式"
      >
        <option value="updated">按更新时间</option>
        <option value="cost">按输入价格</option>
        <option value="context">按上下文</option>
        <option value="name">按名称</option>
      </select>
    </div>

    <div class="filterbar">
      <button
        v-for="f in featuresList()"
        :key="f.key"
        type="button"
        :class="['filterchip', { on: filter[f.key] }]"
        :aria-pressed="!!filter[f.key]"
        @click="toggle(f.key)"
      >
        <span class="dot" />{{ f.label }}
      </button>
      <button
        type="button"
        :class="['filterchip', { on: filter.vision }]"
        :aria-pressed="!!filter.vision"
        @click="toggle('vision')"
      >
        <span class="dot" />多模态
      </button>
      <div class="pager-inline">
        <button
          type="button"
          class="pg-btn"
          :disabled="page <= 1"
          title="上一页"
          aria-label="上一页"
          @click="page--"
        >‹</button>
        <span class="meta">
          <template v-if="total === 0">无结果</template>
          <template v-else>
            {{ from }}–{{ to }} / <b>{{ total }}</b>{{ total !== rows.length ? ` · 总 ${rows.length}` : '' }}
          </template>
        </span>
        <button
          type="button"
          class="pg-btn"
          :disabled="page >= totalPages"
          title="下一页"
          aria-label="下一页"
          @click="page++"
        >›</button>
      </div>
    </div>

    <div class="list-head" aria-hidden="true">
      <span class="lh-logo" />
      <span class="lh-main">模型</span>
      <span class="lh-ctx">上下文</span>
      <span class="lh-price">入 / 出 · /M</span>
      <span class="lh-feats">能力</span>
    </div>

    <div class="scroll-list" role="listbox" aria-label="模型列表">
      <div
        v-for="r in pageItems"
        :key="rowKey(r)"
        role="option"
        :aria-selected="!!(selected && rowKey(selected) === rowKey(r))"
        tabindex="0"
        :class="['row-item', { on: selected && rowKey(selected) === rowKey(r) }]"
        @click="emit('select', r)"
        @keydown="onRowKey($event, r)"
      >
        <Logo :id="r.providerId" :name="r.providerName" :size="26" />
        <div class="col-main">
          <div class="row-name">
            <span class="name-text" :title="r.name">{{ r.name }}</span>
            <span v-if="r.status" :class="['tag-status', r.status]">{{ r.status }}</span>
          </div>
          <div class="row-sub">
            <span class="provider">{{ r.providerName }}</span>
            <span class="sep">·</span>
            <span class="id" :title="r.id">{{ r.id }}</span>
          </div>
        </div>
        <div class="col-ctx" title="上下文窗口">
          {{ formatTokens(contextLimit(r)) }}
        </div>
        <div class="col-price" title="输入 / 输出 · 每百万 token USD">
          <span v-if="inputCost(r) != null || outputCost(r) != null" class="price-pair">
            <span class="price-in">{{ formatCost(inputCost(r)) }}</span>
            <span class="price-sep">/</span>
            <span class="price-out">{{ formatCost(outputCost(r)) }}</span>
          </span>
          <span v-else class="price-none">—</span>
        </div>
        <div class="col-feats">
          <span v-if="r.reasoning" class="badge reason">推理</span>
          <span v-if="r.tool_call" class="badge tool">工具</span>
          <span v-if="hasVision(r)" class="badge vision">多模态</span>
          <span v-if="r.open_weights" class="badge open">开源</span>
        </div>
      </div>
      <div v-if="pageItems.length === 0" class="list-empty">未匹配到模型，换个关键词试试</div>
    </div>
  </div>
</template>
