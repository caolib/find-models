<script setup>
import { computed, ref, watch } from 'vue'
import {
  inputCost,
  outputCost,
  contextLimit,
  formatCost,
  perKCost
} from './data'
import Icon from './Icon.vue'
import './detail.css'

const props = defineProps({
  row: { type: Object, required: true }
})
const emit = defineEmits(['close'])

const VISION = ['image', 'video', 'audio', 'pdf']

// ponytail: 原文 token 展示，含 xhigh；未知档位按 API 原样附后
const EFFORT_ORDER = ['none', 'low', 'medium', 'high', 'xhigh', 'max']

function modTagClass (m) {
  return ['text'].includes(m) ? 'text' : m
}

const copied = ref(false)
const pk = computed(() => perKCost(props.row))
const ctx = computed(() => contextLimit(props.row))
const inMax = computed(() => props.row.limit?.input)
const outMax = computed(() => props.row.limit?.output)

function openUrl (u) {
  window.utools?.shellOpenExternal?.(u) || window.open(u, '_blank')
}

watch(() => props.row.id, () => { copied.value = false })

let copyTimer
function copyId () {
  window.services?.copyText?.(props.row.id)
  copied.value = true
  clearTimeout(copyTimer)
  copyTimer = setTimeout(() => { copied.value = false }, 1200)
}

function fmt (n) {
  if (n == null) return ['—', '']
  if (n >= 1_000_000) return [(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0), 'M']
  if (n >= 1000) return [Math.round(n / 1000), 'K']
  return [String(n), '']
}

const ctxParts = computed(() => fmt(ctx.value))
const inParts = computed(() => fmt(inMax.value))
const outParts = computed(() => fmt(outMax.value))

const inMods = computed(() => props.row.modalities?.input || [])
const outMods = computed(() => props.row.modalities?.output || [])
const multimodal = computed(() =>
  inMods.value.filter((m) => VISION.includes(m)).length > 0 ||
  outMods.value.filter((m) => m !== 'text').length > 0
)

const reasonTags = computed(() => {
  if (!props.row.reasoning) return []
  const effort = props.row.reasoning_options?.find((o) => o.type === 'effort')
  const values = effort?.values || []
  const ordered = values
    .filter((v) => EFFORT_ORDER.includes(v))
    .sort((a, b) => EFFORT_ORDER.indexOf(a) - EFFORT_ORDER.indexOf(b))
  const others = values.filter((v) => !EFFORT_ORDER.includes(v))
  return [...ordered, ...others]
})

const hasBudget = computed(() => props.row.reasoning_options?.some((o) => o.type === 'budget_tokens'))
const hasToggle = computed(() => props.row.reasoning_options?.some((o) => o.type === 'toggle'))
</script>

<template>
  <div class="side-detail">
    <div class="sd-head">
      <h1>
        {{ row.name }}
        <span v-if="row.status" :class="['tag-status', row.status]">{{ row.status }}</span>
      </h1>
      <button class="sd-close" title="关闭预览" @click="emit('close')">×</button>
    </div>

    <div class="sd-body">
      <p v-if="row.description" class="sd-desc">{{ row.description }}</p>

      <!-- 重点 1: Model ID -->
      <div class="id-card">
        <div class="id-label">Model ID · AI SDK 标识</div>
        <div class="id-row">
          <div class="id-value">{{ row.id }}</div>
          <button
            type="button"
            :class="['id-copy', { ok: copied }]"
            :title="copied ? '已复制' : '复制 ID'"
            @click="copyId"
          >
            <Icon :name="copied ? 'check' : 'copy'" :size="13" />
          </button>
        </div>
      </div>

      <!-- 重点 2: 上下文 -->
      <div class="ctx-hero">
        <div :class="['ctx-cell', { primary: ctx != null }]">
          <div class="ctx-lbl">上下文</div>
          <div class="ctx-val">
            {{ ctxParts[0] }}<span class="ctx-unit">{{ ctxParts[1] }}</span>
          </div>
          <div class="ctx-sub">总窗口</div>
        </div>
        <div class="ctx-cell">
          <div class="ctx-lbl">输入上限</div>
          <div class="ctx-val">
            {{ inParts[0] }}<span class="ctx-unit">{{ inParts[1] }}</span>
          </div>
          <div class="ctx-sub">max input</div>
        </div>
        <div class="ctx-cell">
          <div class="ctx-lbl">输出上限</div>
          <div class="ctx-val">
            {{ outParts[0] }}<span class="ctx-unit">{{ outParts[1] }}</span>
          </div>
          <div class="ctx-sub">max output</div>
        </div>
      </div>

      <!-- 重点 3: 推理 + 思考水平 -->
      <div v-if="!row.reasoning" class="reason-hero off">
        <div class="rh-top">
          <Icon name="brain" :size="15" />
          <span class="rh-name">推理 / 思考链</span>
          <span class="rh-pill no">不支持</span>
        </div>
      </div>
      <div v-else class="reason-hero">
        <div class="rh-top">
          <Icon name="brain" :size="15" />
          <span class="rh-name">推理 / 思考链</span>
          <span class="rh-pill yes">支持</span>
        </div>
        <div v-if="reasonTags.length" class="effort-row">
          <span class="er-label">思考水平</span>
          <span v-for="v in reasonTags" :key="v" class="effort-tag">{{ v }}</span>
        </div>
        <div v-if="hasBudget || hasToggle || row.interleaved" class="effort-meta">
          <span v-if="hasBudget">· 支持 budget_tokens 控制思考预算</span>
          <span v-if="hasToggle">· 支持 toggle 开关</span>
          <span v-if="row.interleaved">
            · 交错推理 (
            {{ typeof row.interleaved === 'object' ? row.interleaved.field : 'on' }}
            )
          </span>
        </div>
        <div v-else-if="!reasonTags.length" class="effort-meta">
          <span>· 默认开启，未提供档位配置</span>
        </div>
      </div>

      <!-- 重点 4: 多模态 / 输入输出类型 -->
      <div class="mod-hero">
        <div class="mod-block">
          <span class="mb-arrow">↓</span>
          <span class="mb-label">输入</span>
          <div class="mod-tags">
            <span v-if="inMods.length === 0" class="mod-tag none">未声明</span>
            <span
              v-for="m in inMods"
              :key="m"
              :class="['mod-tag', modTagClass(m)]"
            >{{ m }}</span>
          </div>
        </div>
        <div class="mod-block">
          <span class="mb-arrow">↑</span>
          <span class="mb-label">输出</span>
          <div class="mod-tags">
            <span v-if="outMods.length === 0" class="mod-tag none">未声明</span>
            <span
              v-for="m in outMods"
              :key="m"
              :class="['mod-tag', modTagClass(m)]"
            >{{ m }}</span>
          </div>
        </div>
        <div class="mod-block">
          <span class="mb-arrow">◇</span>
          <span class="mb-label">多模态</span>
          <div class="mod-tags">
            <span v-if="multimodal" class="mod-tag image">支持非文本模态</span>
            <span v-else class="mod-tag text">仅文本</span>
          </div>
        </div>
      </div>

      <!-- ===== 次要信息 ===== -->
      <div class="sd-section">
        <div class="ss-title">其他能力</div>
        <div class="cap-row">
          <span :class="['cap-tag', row.tool_call ? 'on' : 'off']">
            <span class="d" />工具调用
          </span>
          <span :class="['cap-tag', row.structured_output ? 'on' : 'off']">
            <span class="d" />结构化输出
          </span>
          <span :class="['cap-tag', row.attachment ? 'on' : 'off']">
            <span class="d" />附件
          </span>
          <span :class="['cap-tag', row.temperature ? 'on' : 'off']">
            <span class="d" />温度控制
          </span>
          <span :class="['cap-tag', row.open_weights ? 'on' : 'off']">
            <span class="d" />开源权重
          </span>
        </div>
      </div>

      <div class="sd-section">
        <div class="ss-title">价格 / 百万 token (USD)</div>
        <div class="price-mini">
          <div class="pm-card">
            <div class="pm-l">输入</div>
            <div class="pm-v">{{ formatCost(inputCost(row)) }}</div>
          </div>
          <div class="pm-card hl">
            <div class="pm-l">输出</div>
            <div class="pm-v">{{ formatCost(outputCost(row)) }}</div>
          </div>
          <div v-if="row.cost?.reasoning != null" class="pm-card">
            <div class="pm-l">推理</div>
            <div class="pm-v">{{ formatCost(row.cost.reasoning) }}</div>
          </div>
          <div v-if="row.cost?.cache_read != null" class="pm-card">
            <div class="pm-l">缓存读</div>
            <div class="pm-v">{{ formatCost(row.cost.cache_read) }}</div>
          </div>
          <div v-if="row.cost?.cache_write != null" class="pm-card">
            <div class="pm-l">缓存写</div>
            <div class="pm-v">{{ formatCost(row.cost.cache_write) }}</div>
          </div>
          <div v-if="row.cost?.input_audio != null" class="pm-card">
            <div class="pm-l">音频入</div>
            <div class="pm-v">{{ formatCost(row.cost.input_audio) }}</div>
          </div>
          <div v-if="row.cost?.output_audio != null" class="pm-card">
            <div class="pm-l">音频出</div>
            <div class="pm-v">{{ formatCost(row.cost.output_audio) }}</div>
          </div>
        </div>
        <div
          v-if="pk && (pk.input != null || pk.output != null)"
          class="kv-mini"
          style="margin-top: 5px; grid-template-columns: 88px 1fr"
        >
          <span class="k">每千 token</span>
          <span class="v mono">
            {{ pk.input != null ? `$${pk.input.toFixed(4)} 入` : '' }}
            {{ pk.input != null && pk.output != null ? '   ' : '' }}
            {{ pk.output != null ? `$${pk.output.toFixed(4)} 出` : '' }}
          </span>
        </div>
      </div>

      <div class="sd-section">
        <div class="ss-title">基本信息</div>
        <div class="kv-mini">
          <span class="k">Family</span>
          <span class="v">{{ row.family || '—' }}</span>
        </div>
        <div class="kv-mini">
          <span class="k">知识截止</span>
          <span class="v">{{ row.knowledge || '—' }}</span>
        </div>
        <div class="kv-mini">
          <span class="k">发布</span>
          <span class="v mono">{{ row.release_date || '—' }}</span>
        </div>
        <div class="kv-mini">
          <span class="k">更新</span>
          <span class="v mono">{{ row.last_updated || '—' }}</span>
        </div>
      </div>

      <div class="sd-section">
        <div class="ss-title">厂商 · {{ row.providerName }}</div>
        <div class="kv-mini">
          <span class="k">Provider</span>
          <span class="v mono">{{ row.providerId }}</span>
        </div>
        <div v-if="row.providerNpm" class="kv-mini">
          <span class="k">SDK 包</span>
          <span class="v mono">{{ row.providerNpm }}</span>
        </div>
        <div v-if="row.providerApi" class="kv-mini">
          <span class="k">API 端点</span>
          <span class="v mono">{{ row.providerApi }}</span>
        </div>
        <div v-if="row.providerEnv?.length > 0" class="kv-mini">
          <span class="k">环境变量</span>
          <span class="v mono">{{ row.providerEnv.join('、') }}</span>
        </div>
        <span
          v-if="row.providerDoc"
          class="link-pill"
          @click="openUrl(row.providerDoc)"
        >
          <Icon name="doc" :size="12" />
          厂商文档 ↗
        </span>
      </div>

      <div v-if="row.benchmarks?.length > 0" class="sd-section">
        <div class="ss-title">Benchmarks</div>
        <table class="bench-mini">
          <thead>
            <tr>
              <th>Benchmark</th>
              <th>分数</th>
              <th>指标</th>
              <th>源</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(b, i) in row.benchmarks" :key="i">
              <td>{{ b.name }}{{ b.version ? ` v${b.version}` : '' }}</td>
              <td class="sc">{{ b.score }}</td>
              <td>{{ b.metric }}</td>
              <td>
                <span v-if="b.source" class="src" @click="openUrl(b.source)">↗</span>
                <template v-else>—</template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="row.weights?.length > 0" class="sd-section">
        <div class="ss-title">模型权重</div>
        <span
          v-for="(w, i) in row.weights"
          :key="i"
          class="link-pill"
          @click="w.url && openUrl(w.url)"
        >
          <Icon name="download" :size="12" />
          {{ w.label || '权重' }}{{ w.format ? ` · ${w.format}` : '' }}
        </span>
      </div>
    </div>
  </div>
</template>
