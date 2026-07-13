import { useEffect, useMemo, useState } from 'react'
import {
  flatten, featuresList, inputCost, outputCost, contextLimit,
  formatTokens, formatCost
} from './data'
import { Icon } from './Icon'
import { Logo } from './Logo'
import './index.css'

const VISION_MODALITIES = ['image', 'video', 'audio', 'pdf']

function hasVision (row) {
  return row.modalities?.input?.some((m) => VISION_MODALITIES.includes(m))
}

function rowKey (r) {
  return r.providerId + '/' + r.id
}

export default function Search ({ enterAction, onSelect, selected }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState({})
  const [sort, setSort] = useState('updated')
  const PAGE = 50
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (enterAction?.type === 'over' && enterAction?.payload) setQuery(enterAction.payload.trim())
  }, [enterAction])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const catalog = await window.services.getCatalog()
        if (!alive) return
        setRows(flatten(catalog))
        setLoading(false)
      } catch (e) {
        if (!alive) return
        setError(e.message || String(e))
        setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = rows
    if (q) {
      list = list.filter((r) =>
        r.id.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.family.toLowerCase().includes(q) ||
        r.providerName.toLowerCase().includes(q) ||
        r.providerId.toLowerCase().includes(q)
      )
    }
    const activeFt = Object.entries(filter).filter(([, v]) => v).map(([k]) => k)
    if (activeFt.length) {
      list = list.filter((r) => activeFt.every((k) => (k === 'vision' ? hasVision(r) : r[k])))
    }

    const sorted = [...list]
    switch (sort) {
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
  }, [rows, query, filter, sort])

  useEffect(() => { setPage(1) }, [query, filter, sort])

  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE))
  const pageItems = filtered.slice((page - 1) * PAGE, page * PAGE)
  const from = total === 0 ? 0 : (page - 1) * PAGE + 1
  const to = Math.min(page * PAGE, total)

  const toggle = (k) => setFilter((f) => ({ ...f, [k]: !f[k] }))

  if (loading) {
    return (
      <div className='state-wrap'>
        <div className='spinner' />
        <div className='big'>加载模型数据中…</div>
      </div>
    )
  }
  if (error) {
    return (
      <div className='state-wrap state-error'>
        <Icon name='x' size={22} />
        <div className='big'>数据加载失败</div>
        <div style={{ fontSize: 11 }}>{error}</div>
        <button type='button' onClick={() => window.services.getCatalog(true).then(() => location.reload())}>重试</button>
      </div>
    )
  }

  return (
    <div className='search-view'>
      <div className='topbar'>
        <input
          className='search-input'
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='搜索 模型 / 厂商 / family   例: gpt-5, claude, glm'
          aria-label='搜索模型'
        />
        <select
          className='sort-select'
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          title='排序方式'
          aria-label='排序方式'
        >
          <option value='updated'>按更新时间</option>
          <option value='cost'>按输入价格</option>
          <option value='context'>按上下文</option>
          <option value='name'>按名称</option>
        </select>
      </div>

      <div className='filterbar'>
        {featuresList().map((f) => (
          <button
            type='button'
            key={f.key}
            className={`filterchip ${filter[f.key] ? 'on' : ''}`}
            onClick={() => toggle(f.key)}
            aria-pressed={!!filter[f.key]}
          >
            <span className='dot' />{f.label}
          </button>
        ))}
        <button
          type='button'
          className={`filterchip ${filter.vision ? 'on' : ''}`}
          onClick={() => toggle('vision')}
          aria-pressed={!!filter.vision}
        >
          <span className='dot' />多模态
        </button>
        <div className='pager-inline'>
          <button type='button' className='pg-btn' disabled={page <= 1} onClick={() => setPage((p) => p - 1)} title='上一页' aria-label='上一页'>‹</button>
          <span className='meta'>
            {total === 0
              ? '无结果'
              : <>{from}–{to} / <b>{total}</b>{total !== rows.length ? ` · 总 ${rows.length}` : ''}</>}
          </span>
          <button type='button' className='pg-btn' disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} title='下一页' aria-label='下一页'>›</button>
        </div>
      </div>

      <div className='list-head' aria-hidden>
        <span className='lh-logo' />
        <span className='lh-main'>模型</span>
        <span className='lh-ctx'>上下文</span>
        <span className='lh-price'>入 / 出 · /M</span>
        <span className='lh-feats'>能力</span>
      </div>

      <div className='scroll-list' role='listbox' aria-label='模型列表'>
        {pageItems.map((r) => {
          const on = selected && rowKey(selected) === rowKey(r)
          const inn = inputCost(r)
          const out = outputCost(r)
          return (
            <div
              key={rowKey(r)}
              role='option'
              aria-selected={!!on}
              tabIndex={0}
              className={`row-item ${on ? 'on' : ''}`}
              onClick={() => onSelect(r)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelect(r)
                }
              }}
            >
              <Logo id={r.providerId} name={r.providerName} size={26} />
              <div className='col-main'>
                <div className='row-name'>
                  <span className='name-text' title={r.name}>{r.name}</span>
                  {r.status && <span className={`tag-status ${r.status}`}>{r.status}</span>}
                </div>
                <div className='row-sub'>
                  <span className='provider'>{r.providerName}</span>
                  <span className='sep'>·</span>
                  <span className='id' title={r.id}>{r.id}</span>
                </div>
              </div>
              <div className='col-ctx' title='上下文窗口'>
                {formatTokens(contextLimit(r))}
              </div>
              <div className='col-price' title='输入 / 输出 · 每百万 token USD'>
                {inn != null || out != null ? (
                  <span className='price-pair'>
                    <span className='price-in'>{formatCost(inn)}</span>
                    <span className='price-sep'>/</span>
                    <span className='price-out'>{formatCost(out)}</span>
                  </span>
                ) : (
                  <span className='price-none'>—</span>
                )}
              </div>
              <div className='col-feats'>
                {r.reasoning && <span className='badge reason'>推理</span>}
                {r.tool_call && <span className='badge tool'>工具</span>}
                {hasVision(r) && <span className='badge vision'>多模态</span>}
                {r.open_weights && <span className='badge open'>开源</span>}
              </div>
            </div>
          )
        })}
        {pageItems.length === 0 && <div className='list-empty'>未匹配到模型，换个关键词试试</div>}
      </div>
    </div>
  )
}
