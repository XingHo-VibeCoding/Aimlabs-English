// MyWorldView —— 主视图「我的世界」
// 展示用户用英文造过的所有东西（卡片墙）
// 四种状态：loading 加载中 / success 有数据 / empty 空 / error 出错
// 底部有一个「状态模拟器」开关，方便手动切换四种状态亲眼验证（第 3 周接真 API 后移除）

import { useState } from 'react'
import WorldItemCard from '../components/WorldItemCard.jsx'
import { MOCK_WORLD_ITEMS } from '../data/mockWorldItems.js'

// 四个状态名，中文 + 英文，方便理解
const STATUSES = [
  { key: 'loading', label: '加载中 Loading' },
  { key: 'success', label: '有数据 Success' },
  { key: 'empty', label: '空 Empty' },
  { key: 'error', label: '出错 Error' },
]

export default function MyWorldView() {
  const [status, setStatus] = useState('success')

  return (
    <div className="myworld">
      <div className="myworld-header">
        <h1 className="myworld-title">我的世界 · My World</h1>
        <p className="myworld-sub">用英文造过的东西，都在这里 · Everything you've built with English lives here</p>
      </div>

      <div className="myworld-body">
        {status === 'loading' && (
          <div className="state-box">
            <div className="spinner" />
            <p>正在加载你的世界… Loading your world…</p>
          </div>
        )}

        {status === 'error' && (
          <div className="state-box state-error">
            <div className="state-icon">⚠</div>
            <p>加载失败，请刷新重试 · Failed to load, please refresh</p>
          </div>
        )}

        {status === 'empty' && (
          <div className="state-box">
            <div className="state-icon">🌱</div>
            <p>你还没造过东西 · Nothing here yet</p>
            <p className="state-hint">回到编辑器，输入一句英文试试，比如 a red tree</p>
          </div>
        )}

        {status === 'success' && (
          <div className="world-grid">
            {MOCK_WORLD_ITEMS.map((item) => (
              <WorldItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* 状态模拟器：手动切换四种状态，验证用（第 3 周接真 API 后移除） */}
      <div className="state-switcher">
        <span className="state-switcher-label">状态模拟 State Demo：</span>
        {STATUSES.map((s) => (
          <button
            key={s.key}
            className={status === s.key ? 'state-btn active' : 'state-btn'}
            onClick={() => setStatus(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}
