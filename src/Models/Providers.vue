<script setup>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import {
  flatten, contextLimit, formatTokens
} from './data'
import Logo from './Logo.vue'
import Icon from './Icon.vue'
import './index.css'

const props = defineProps({
  selected: { type: Object, default: null }
})
const emit = defineEmits(['select'])

function loadPinned() {
  return window.services?.getPinnedProviders?.() || []
}

const rows = ref([])
const loading = ref(true)
const error = ref('')
const active = ref(null)
const q = ref('')
const pinned = ref(loadPinned())

let alive = true
onUnmounted(() => { alive = false })

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

function togglePin(id, e) {
  e.stopPropagation()
  const prev = pinned.value
  const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
  window.services?.setPinnedProviders?.(next)
  pinned.value = next
}

const byProvider = computed(() => {
  const map = new Map()
  for (const r of rows.value) {
    if (!map.has(r.providerId)) {
      map.set(r.providerId, {
        id: r.providerId,
        name: r.providerName,
        doc: r.providerDoc,
        count: 0,
        models: []
      })
    }
    const p = map.get(r.providerId)
    p.count++
    p.models.push(r)
  }
  for (const p of map.values()) {
    p.models.sort((a, b) => (b.release_date || '').localeCompare(a.release_date || ''))
  }
  const pinRank = new Map(pinned.value.map((id, i) => [id, i]))
  return [...map.values()].sort((a, b) => {
    const ap = pinRank.has(a.id)
    const bp = pinRank.has(b.id)
    if (ap && bp) return pinRank.get(a.id) - pinRank.get(b.id)
    if (ap) return -1
    if (bp) return 1
    return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
  })
})

watch(byProvider, (list) => {
  if (!active.value && list.length) active.value = list[0].id
}, { immediate: true })

const filteredProviders = computed(() => {
  const s = q.value.trim().toLowerCase()
  if (!s) return byProvider.value
  return byProvider.value.filter(
    (p) => p.name.toLowerCase().includes(s) || p.id.toLowerCase().includes(s)
  )
})

const activeP = computed(() => byProvider.value.find((p) => p.id === active.value) || null)
const pinSet = computed(() => new Set(pinned.value))

function retry() {
  window.services.getCatalog(true).then(() => location.reload())
}

function onKey(e, fn) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    fn()
  }
}
</script>

<template>
  <div v-if="loading" class="state-wrap">
    <div class="spinner" />
    <div class="big">加载厂商数据中…</div>
  </div>
  <div v-else-if="error" class="state-wrap state-error">
    <div class="big">加载失败</div>
    <div style="font-size: 11px">{{ error }}</div>
    <button type="button" @click="retry">重试</button>
  </div>
  <div v-else class="providers">
    <aside class="prov-aside" aria-label="厂商列表">
      <div class="prov-search">
        <input class="prov-search-input" v-model="q" placeholder="筛选厂商…" aria-label="筛选厂商">
      </div>
      <div class="prov-list">
        <div v-for="p in filteredProviders" :key="p.id"
          :class="['prov-item', { active: active === p.id, pinned: pinSet.has(p.id) }]" role="button" tabindex="0"
          :aria-current="active === p.id ? 'true' : undefined" @click="active = p.id"
          @keydown="onKey($event, () => { active = p.id })">
          <Logo :id="p.id" :name="p.name" :size="22" />
          <span class="name" :title="p.name">{{ p.name }}</span>
          <button type="button" :class="['prov-pin', { on: pinSet.has(p.id) }]"
            :title="pinSet.has(p.id) ? '取消置顶' : '置顶'" :aria-label="pinSet.has(p.id) ? '取消置顶' : '置顶'"
            :aria-pressed="pinSet.has(p.id)" @click="togglePin(p.id, $event)">
            <Icon name="pin" :size="12" />
          </button>
          <span class="num">{{ p.count }}</span>
        </div>
        <div v-if="filteredProviders.length === 0" class="list-empty" style="padding: 24px 8px">无匹配厂商</div>
      </div>
    </aside>

    <div class="prov-main">
      <template v-if="activeP">
        <div class="prov-head">
          <Logo :id="activeP.id" :name="activeP.name" :size="32" />
          <div class="prov-head-text">
            <h2>{{ activeP.name }}</h2>
            <div class="prov-head-sub">
              <span class="id">{{ activeP.id }}</span>
              <span class="sep">·</span>
              <span class="cnt">{{ activeP.count }} 个模型</span>
            </div>
          </div>
          <button type="button" :class="['prov-pin-head', { on: pinSet.has(activeP.id) }]"
            :title="pinSet.has(activeP.id) ? '取消置顶' : '置顶'" :aria-label="pinSet.has(activeP.id) ? '取消置顶' : '置顶'"
            :aria-pressed="pinSet.has(activeP.id)" @click="togglePin(activeP.id, $event)">
            <Icon name="pin" :size="13" />
            {{ pinSet.has(activeP.id) ? '已置顶' : '置顶' }}
          </button>
        </div>
        <div class="prov-models">
          <div v-for="r in activeP.models" :key="r.id" role="button" tabindex="0"
            :class="['row-item', 'mini', { on: selected?.id === r.id && selected?.providerId === r.providerId }]"
            @click="emit('select', r)" @keydown="onKey($event, () => emit('select', r))">
            <div class="col-main">
              <div class="row-name">
                {{ r.name }}
                <span v-if="r.status" :class="['tag-status', r.status]">{{ r.status }}</span>
              </div>
              <div class="row-sub">
                <span class="id">{{ r.id }}</span>
                <!-- <span class="sep">·</span> -->
                <!-- <span class="ctx">{{ formatTokens(contextLimit(r)) }}</span> -->
              </div>
            </div>
            <div class="col-feats">
              <span v-if="r.reasoning" class="badge reason">推理</span>
              <span v-if="r.tool_call" class="badge tool">工具</span>
              <span v-if="r.open_weights" class="badge open">开源</span>
            </div>
          </div>
        </div>
      </template>
      <div v-else class="list-empty">← 选择左侧厂商查看模型</div>
    </div>
  </div>
</template>
