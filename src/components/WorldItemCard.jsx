// WorldItemCard —— 可复用卡片组件
// 展示一条「用户输入英文 → 生成的物体」记录
// props: item { phrase, type, color, scale, createdAt }, selected(布尔), onClick(函数)

import { typeLabel, colorLabel } from '../ai/dictionary.js'

function colorHex(num) {
  return '#' + num.toString(16).padStart(6, '0')
}

export default function WorldItemCard({ item, selected, onClick }) {
  return (
    <div
      className={selected ? 'world-card selected' : 'world-card'}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      <div className="world-card-swatch" style={{ backgroundColor: colorHex(item.color) }} />
      <div className="world-card-body">
        <div className="world-card-phrase">{item.phrase}</div>
        <div className="world-card-meta">
          <span className="world-card-tag">{typeLabel(item.type)}</span>
          <span className="world-card-tag">{colorLabel(item.color)}</span>
          <span className="world-card-tag">size {item.scale.toFixed(1)}</span>
        </div>
      </div>
      <div className="world-card-time">{item.createdAt}</div>
      {selected && <span className="world-card-badge">✓ 已选</span>}
    </div>
  )
}
