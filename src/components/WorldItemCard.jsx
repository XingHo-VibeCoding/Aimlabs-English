// WorldItemCard —— 可复用卡片组件
// 展示一条「用户输入英文 → 生成的物体」记录
// props: item { phrase, type, color, scale, createdAt }

import { typeLabel, colorLabel } from '../ai/dictionary.js'

function colorHex(num) {
  return '#' + num.toString(16).padStart(6, '0')
}

export default function WorldItemCard({ item }) {
  return (
    <div className="world-card">
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
    </div>
  )
}
