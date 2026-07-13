import { useEffect, useState } from 'react'
import Search from './models/Search'
import Detail from './models/Detail'
import Providers from './models/Providers'
import './models/app.css'

export default function App () {
  const [enterAction, setEnterAction] = useState({})
  const [tab, setTab] = useState('search') // search | providers
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    // ponytail: dev 浏览器无 utools 注入，守卫一下避免崩；uTools 运行时才注册
    const u = window.utools
    if (!u) return
    u.onPluginEnter((action) => {
      setEnterAction(action)
      setSelected(null)
      // 划词/任意入口都进首页，默认搜索 tab
      setTab('search')
    })
    u.onPluginOut(() => {
      setEnterAction({})
      setSelected(null)
    })
  }, [])

  const select = (row) => setSelected(row)
  const close = () => setSelected(null)

  return (
    <div className='app-shell'>
      <div className='app-main'>
        <div className='app-tabs'>
          <button
            type='button'
            className={`app-tab ${tab === 'search' ? 'on' : ''}`}
            onClick={() => setTab('search')}
          >
            搜索
          </button>
          <button
            type='button'
            className={`app-tab ${tab === 'providers' ? 'on' : ''}`}
            onClick={() => setTab('providers')}
          >
            厂商
          </button>
        </div>
        <div className='app-panel'>
          {tab === 'providers'
            ? <Providers onSelect={select} selected={selected} />
            : <Search enterAction={enterAction} onSelect={select} selected={selected} />}
        </div>
      </div>
      {selected && (
        <aside className='app-side'>
          <Detail row={selected} onClose={close} />
        </aside>
      )}
    </div>
  )
}
