// MyWorldView —— 主视图「我的世界」
// 展示素材库（能造的东西的清单），数据来自后端 /api/assets（Day 20 接线真数据）
// 四种状态：loading 加载中 / success 有数据 / empty 空 / error 出错
// （Day 20 之前这里用的是本地假数据 MOCK_WORLD_ITEMS，现已换成真实接口）

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import WorldItemCard from '../components/WorldItemCard.jsx'

// 后端接口完整地址（前端静态托管域名和接口域名不同源，必须写完整公网地址）
// Day 20 定：静态托管 tcloudbaseapp.com，接口 app.tcloudbase.com，跨域已由后端放行
const API_BASE = 'https://fallsnow-d4gwz9mht57ea9014-1499380185.ap-shanghai.app.tcloudbase.com'
const ASSETS_URL = `${API_BASE}/api/assets`

// 素材来源 → 卡片色块（一眼区分预制 / AI 生成；数据库里 source 只有这两种值）
const SOURCE_COLOR = {
  preset: 0x4caf50,       // 预制素材 = 绿
  ai_generated: 0xab47bc, // AI 生成 = 紫
}

// 筛选维度：按素材类别筛。'all' = 全部；其余来自数据库 assets.category 可能出现的值
const FILTERS = ['all', 'nature', 'building', 'animal', 'prop']

/**
 * 适配层：把后端 assets 表的字段（id/name_en/category/source/variant_params）
 * 映射成卡片组件认识的字段（phrase/type/color/scale/createdAt）。
 * 这样 WorldItemCard 不用改，就能直接展示素材。
 */
function adaptAsset(a) {
  return {
    id: a.id,
    phrase: a.name_en || a.id,                 // 素材英文名
    type: a.category || 'prop',                // 类别（nature/building/animal/prop）
    color: SOURCE_COLOR[a.source] || 0x9e9e9e, // 来源色块
    scale: 1.0,                                // 素材库没有大小概念，固定 1
    createdAt: a.source === 'ai_generated' ? 'AI 生成' : '预制 Preset',
  }
}

export default function MyWorldView() {
  const [status, setStatus] = useState('loading') // loading / success / empty / error
  const [items, setItems] = useState([])          // 从接口拉回的素材（已适配）
  const [selectedId, setSelectedId] = useState(null) // 当前选中的卡片 id
  const [filter, setFilter] = useState('all')     // 当前筛选类别，'all' = 全部

  // 挂载时拉一次真数据（Day 20：本地接线，fetch 后端 /api/assets）
  useEffect(() => {
    let cancelled = false
    async function load() {
      setStatus('loading')
      try {
        const res = await fetch(ASSETS_URL)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        if (!json.ok || !Array.isArray(json.data)) {
          throw new Error('接口返回格式不对')
        }
        const adapted = json.data.map(adaptAsset)
        if (cancelled) return
        setItems(adapted)
        setStatus(adapted.length === 0 ? 'empty' : 'success')
      } catch (err) {
        if (cancelled) return
        console.error('加载素材失败', err)
        setStatus('error')
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // 按当前筛选条件过滤：'all' 显示全部，否则只显示 category 匹配的卡片
  const filteredItems =
    filter === 'all' ? items : items.filter((it) => it.type === filter)

  // 点击卡片：选中 / 取消（再点同一张 = 取消）
  function toggleSelect(id) {
    setSelectedId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="myworld">
      <div className="myworld-header">
        <Link className="topbar-btn myworld-back" to="/" title="回到主界面 · Back to home">
          ← 主界面
        </Link>
        <h1 className="myworld-title">我的世界 · My World</h1>
        <p className="myworld-sub">素材库 · 能造的东西都在这里 · Everything you can build</p>
      </div>

      {/* 筛选条：按素材类别筛，'全部' 一键恢复全量 */}
      <div className="filter-bar" role="group" aria-label="按类别筛选 · Filter by category">
        {FILTERS.map((f) => (
          <button
            key={f}
            className={filter === f ? 'filter-chip active' : 'filter-chip'}
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? '全部 All' : f}
          </button>
        ))}
      </div>

      <div className="myworld-body">
        {status === 'loading' && (
          <div className="state-box">
            <div className="spinner" />
            <p>正在加载素材库… Loading assets…</p>
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
            <p>素材库还是空的 · No assets yet</p>
            <p className="state-hint">回到数据库，往 assets 表加几条素材试试</p>
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
            <p>没有这个类别的素材 · No assets of this category</p>
            <p className="state-hint">换个类别，或点「全部」回到全部素材 · Pick another, or tap All</p>
          </div>
        )}
      </div>
    </div>
  )
}
