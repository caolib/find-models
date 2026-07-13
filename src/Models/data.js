// 数据访问与筛选：把 catalog.json 的两层结构展平成易查询的视图
// ponytail: 不引入 immer/lodash，直接 reduce

const FEATURES = [
  { key: 'reasoning', label: '推理' },
  { key: 'tool_call', label: '工具调用' },
  { key: 'structured_output', label: '结构化输出' },
  { key: 'attachment', label: '附件' },
  { key: 'temperature', label: '温度' },
  { key: 'open_weights', label: '开源权重' }
]

// catalog.providers[pid].models[mid] = { id, name, cost, limit, ... provider serving }
// catalog.models[mid] = model-only 元数据（可能无 cost）
// 展平成一组可排序、可过滤的记录
export function flatten (catalog) {
  const providers = catalog.providers || {}
  const modelMeta = catalog.models || {}
  const rows = []

  for (const [pid, p] of Object.entries(providers)) {
    if (!p || typeof p !== 'object' || !p.models) continue
    for (const [mid, m] of Object.entries(p.models)) {
      if (!m || typeof m !== 'object') continue
      const base = modelMeta[mid] || {}
      const cost = m.cost || base.cost || null
      const limit = m.limit || base.limit || null
      const modalities = m.modalities || base.modalities || null
      rows.push({
        id: m.id || mid,
        name: m.name || base.name || mid,
        description: m.description || base.description || '',
        family: m.family || base.family || '',
        providerId: pid,
        providerName: p.name || pid,
        providerDoc: p.doc || '',
        providerApi: p.api || '',
        providerNpm: p.npm || '',
        providerEnv: p.env || [],
        knowledge: m.knowledge || base.knowledge || '',
        release_date: m.release_date || base.release_date || '',
        last_updated: m.last_updated || base.last_updated || '',
        attachment: m.attachment ?? base.attachment ?? false,
        reasoning: m.reasoning ?? base.reasoning ?? false,
        reasoning_options: m.reasoning_options || base.reasoning_options || [],
        interleaved: m.interleaved ?? base.interleaved ?? null,
        tool_call: m.tool_call ?? base.tool_call ?? false,
        structured_output: m.structured_output ?? base.structured_output ?? false,
        temperature: m.temperature ?? base.temperature ?? false,
        open_weights: m.open_weights ?? base.open_weights ?? false,
        status: m.status || base.status || '',
        cost,
        limit,
        modalities,
        benchmarks: m.benchmarks || base.benchmarks || [],
        weights: m.weights || base.weights || [],
        links: m.links || base.links || base.links || []
      })
    }
  }
  return rows
}

export function featuresList () {
  return FEATURES
}

// 单价（每百万 token 美元）输入成本，部分老模型可能只有 output
export function inputCost (row) {
  return row.cost && typeof row.cost.input === 'number' ? row.cost.input : null
}

export function outputCost (row) {
  return row.cost && typeof row.cost.output === 'number' ? row.cost.output : null
}

export function contextLimit (row) {
  return row.limit && typeof row.limit.context === 'number' ? row.limit.context : null
}

export function formatTokens (n) {
  if (n == null) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`
  return String(n)
}

export function formatCost (n) {
  if (n == null) return '—'
  if (n === 0) return '0'
  if (n < 1) return `$${n}`
  return `$${n}`
}

// 每千 token 美元，便于估算单次调用
export function perKCost (row) {
  const i = inputCost(row)
  const o = outputCost(row)
  if (i == null && o == null) return null
  return { input: i == null ? null : i / 1000, output: o == null ? null : o / 1000 }
}
