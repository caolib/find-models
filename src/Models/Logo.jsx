import { useEffect, useState } from 'react'

// ponytail: 列表/厂商共用，暗色下缺图用首字母
export function Logo ({ id, name, size = 28 }) {
  const [src, setSrc] = useState(null)
  useEffect(() => {
    let alive = true
    const p = window.services?.providerLogoPath?.(id)
    if (p) { setSrc('file://' + p); return }
    window.services?.getProviderLogo?.(id).then((f) => {
      if (alive && f) setSrc('file://' + f)
    })
    return () => { alive = false }
  }, [id])
  return (
    <div
      className={`logo-box ${src ? '' : 'ph'}`}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.42)) }}
      aria-hidden
    >
      {src
        ? <img src={src} alt='' />
        : <span>{(name || id || '?').slice(0, 1).toUpperCase()}</span>}
    </div>
  )
}
