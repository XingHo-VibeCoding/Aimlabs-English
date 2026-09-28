// MyWorldView —— 主视图「我的世界」
// 展示用户用英文造过的所有东西（卡片墙）
// 四种状态：loading 加载中 / success 有数据 / empty 空 / error 出错
// 底部有一个「状态模拟器」开关，方便手动切换四种状态亲眼验证（第 3 周接真 API 后移除）

import { useState } from 'react'
import WorldItemCard from '../components/WorldItemCard.jsx'
import { MOCK_WORLD_ITEMS } from '../data/mockWorldItems.js'
import { typeLabel } from '../ai/dictionary.js'

// 四个状态名，中文 + 英文，方便理解
const STATUSES = [
  { key: 'loading', label: '加载中 Loading' },
  { key: 'success', label: '有数据 Success' },
  { key: 'empty', label: '空 Empty' },
  { key: 'error', label: '出错 Error' },
]

// 筛选维度：按物体类型筛。'all' = 全部；其余来自 mock 数据里的 type
// 特意加入 mock 里没有的 'bird'，用于演示「无结果」这一种情况
const FILTERS = ['all', 'tree', 'house', 'cat', 'rock', 'mountain', 'ball', 'bird']

export default function MyWorldView({ onBack }) {
  const [status, setStatus] = useState('success')
  const [selectedId, setSelectedId] = useState(null) // 当前选中的卡片 id（null = 无选中）
  const [filter, setFilter] = useState('all') // 当前筛选类型，'all' = 全部

  // 按当前筛选条件过滤：'all' 显示全部，否则只显示 type 匹配的卡片
  const filteredItems =
    filter === 'all' ? MOCK_WORLD_ITEMS : MOCK_WORLD_ITEMS.filter((it) => it.type === filter)

  // 点击卡片：选中 / 取消（再点同一张 = 取消）
  function toggleSelect(id) {
    setSelectedId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="myworld">
      <div className="myworld-header">
        <button className="topbar-btn myworld-back" onClick={onBack} title="回到主界面 · Back to home">
          ← 主界面
        </button>
        <h1 className="myworld-title">我的世界 · My World</h1>
        <p className="myworld-sub">用英文造过的东西，都在这里 · Everything you've built with English lives here</p>
      </div>

      {/* 筛选条：按物体类型筛，'全部' 一键恢复全量 */}
      <div className="filter-bar" role="group" aria-label="按物体类型筛选 · Filter by type">
        {FILTERS.map((f) => (
          <button
            key={f}
            className={filter === f ? 'filter-chip active' : 'filter-chip'}
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? '全部 All' : typeLabel(f)}
          </button>
        ))}
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

        {status === 'success' && filteredItems.length > 0 && (
          <div className="world-grid">
            {filteredItems.map((item) => (
              <WorldItemCard
                key={item.id}
                item={item}
                selected={selectedId === item.id}
                onClick={() => toggleSelect(item.id)}
              />
            ))}
          </div>
        )}

        {status === 'success' && filteredItems.length === 0 && (
          <div className="state-box">
            <div className="state-icon">🔍</div>
            <p>没有找到这个类型的物品 · No items of this type</p>
            <p className="state-hint">换个类型，或点「全部」回到所有物品 · Pick another type, or tap All</p>
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
