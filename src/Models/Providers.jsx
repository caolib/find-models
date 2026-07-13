import { useEffect, useMemo, useState } from 'react'
import { flatten, contextLimit, formatTokens } from './data'
import { Logo } from './Logo'
import { Icon } from './Icon'
import './index.css'

function loadPinned () {
  return window.services?.getPinnedProviders?.() || []
}

export default function Providers ({ onSelect, selected }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [active, setActive] = useState(null)
  const [q, setQ] = useState('')
  const [pinned, setPinned] = useState(loadPinned)

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

  const togglePin = (id, e) => {
    e.stopPropagation()
    setPinned((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      window.services?.setPinnedProviders?.(next)
      return next
    })
  }

  const byProvider = useMemo(() => {
    const map = new Map()
    for (const r of rows) {
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
    const pinRank = new Map(pinned.map((id, i) => [id, i]))
    return [...map.values()].sort((a, b) => {
      const ap = pinRank.has(a.id)
      const bp = pinRank.has(b.id)
      if (ap && bp) return pinRank.get(a.id) - pinRank.get(b.id)
      if (ap) return -1
      if (bp) return 1
      return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
    })
  }, [rows, pinned])

  // 默认选中：置顶第一个，否则字母序第一个
  useEffect(() => {
    if (!active && byProvider.length) setActive(byProvider[0].id)
  }, [byProvider, active])

  const filteredProviders = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return byProvider
    return byProvider.filter(
      (p) => p.name.toLowerCase().includes(s) || p.id.toLowerCase().includes(s)
    )
  }, [byProvider, q])

  const activeP = byProvider.find((p) => p.id === active) || null
  const pinSet = useMemo(() => new Set(pinned), [pinned])

  if (loading) {
    return (
      <div className='state-wrap'>
        <div className='spinner' />
        <div className='big'>加载厂商数据中…</div>
      </div>
    )
  }
  if (error) {
    return (
      <div className='state-wrap state-error'>
        <div className='big'>加载失败</div>
        <div style={{ fontSize: 11 }}>{error}</div>
        <button type='button' onClick={() => window.services.getCatalog(true).then(() => location.reload())}>
          重试
        </button>
      </div>
    )
  }

  return (
    <div className='providers'>
      <aside className='prov-aside' aria-label='厂商列表'>
        <div className='prov-search'>
          <input
            className='prov-search-input'
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder='筛选厂商…'
            aria-label='筛选厂商'
          />
        </div>
        <div className='prov-list'>
          {filteredProviders.map((p) => {
            const isPinned = pinSet.has(p.id)
            return (
              <div
                key={p.id}
                className={`prov-item ${active === p.id ? 'active' : ''} ${isPinned ? 'pinned' : ''}`}
                onClick={() => setActive(p.id)}
                role='button'
                tabIndex={0}
                aria-current={active === p.id ? 'true' : undefined}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setActive(p.id)
                  }
                }}
              >
                <Logo id={p.id} name={p.name} size={22} />
                <span className='name' title={p.name}>{p.name}</span>
                <button
                  type='button'
                  className={`prov-pin ${isPinned ? 'on' : ''}`}
                  title={isPinned ? '取消置顶' : '置顶'}
                  aria-label={isPinned ? '取消置顶' : '置顶'}
                  aria-pressed={isPinned}
                  onClick={(e) => togglePin(p.id, e)}
                >
                  <Icon name='pin' size={12} />
                </button>
                <span className='num'>{p.count}</span>
              </div>
            )
          })}
          {filteredProviders.length === 0 && (
            <div className='list-empty' style={{ padding: '24px 8px' }}>无匹配厂商</div>
          )}
        </div>
      </aside>

      <div className='prov-main'>
        {activeP ? (
          <>
            <div className='prov-head'>
              <Logo id={activeP.id} name={activeP.name} size={32} />
              <div className='prov-head-text'>
                <h2>{activeP.name}</h2>
                <div className='prov-head-sub'>
                  <span className='id'>{activeP.id}</span>
                  <span className='sep'>·</span>
                  <span className='cnt'>{activeP.count} 个模型</span>
                </div>
              </div>
              <button
                type='button'
                className={`prov-pin-head ${pinSet.has(activeP.id) ? 'on' : ''}`}
                title={pinSet.has(activeP.id) ? '取消置顶' : '置顶'}
                aria-label={pinSet.has(activeP.id) ? '取消置顶' : '置顶'}
                aria-pressed={pinSet.has(activeP.id)}
                onClick={(e) => togglePin(activeP.id, e)}
              >
                <Icon name='pin' size={13} />
                {pinSet.has(activeP.id) ? '已置顶' : '置顶'}
              </button>
            </div>
            <div className='prov-models'>
              {activeP.models.map((r) => {
                const on = selected?.id === r.id && selected?.providerId === r.providerId
                return (
                  <div
                    key={r.id}
                    role='button'
                    tabIndex={0}
                    className={`row-item mini ${on ? 'on' : ''}`}
                    onClick={() => onSelect(r)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onSelect(r)
                      }
                    }}
                  >
                    <div className='col-main'>
                      <div className='row-name'>
                        {r.name}
                        {r.status && <span className={`tag-status ${r.status}`}>{r.status}</span>}
                      </div>
                      <div className='row-sub'>
                        <span className='id'>{r.id}</span>
                        <span className='sep'>·</span>
                        <span className='ctx'>{formatTokens(contextLimit(r))}</span>
                      </div>
                    </div>
                    <div className='col-feats'>
                      {r.reasoning && <span className='badge reason'>推理</span>}
                      {r.tool_call && <span className='badge tool'>工具</span>}
                      {r.open_weights && <span className='badge open'>开源</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <div className='list-empty'>← 选择左侧厂商查看模型</div>
        )}
      </div>
    </div>
  )
}
