// HomePage —— 首页（V1 开始页面，PRD §4.2 / AC-1~4）
// 页面目标：登陆游戏，读取存档
// 视觉：星露谷物语风格（夜空 + 星星 + 像素云 + 层叠山脉 + 木质标题），桌面/手机自适应
// 四种状态作用于「存档区」：加载中 / 成功 / 空 / 错误（PRD E6）
// 右下角「演示模拟器」用于亲眼验证四状态，第 3 周接真实数据后移除

import { useState, useEffect } from 'react'
import { readSave, clearSave, writeDemoSave, saveSizeKB } from '../utils/saveStorage.js'

export default function HomePage({ onStart, onWorld }) {
  // saveState: loading | success | empty | error
  const [saveState, setSaveState] = useState('loading')
  const [saveData, setSaveData] = useState(null)
  const [showVocabTip, setShowVocabTip] = useState(false)

  function loadSave() {
    setSaveState('loading')
    // localStorage 本身是同步的，加一小段延时让「加载中」肉眼可见（模拟真实读取）
    setTimeout(() => {
      const result = readSave()
      if (result.ok) {
        setSaveData(result.data)
        setSaveState('success')
      } else if (result.reason === 'corrupted') {
        setSaveState('error')
      } else {
        setSaveState('empty')
      }
    }, 800)
  }

  useEffect(() => {
    loadSave()
  }, [])

  function handleClearSave() {
    clearSave()
    loadSave()
  }

  function handleWriteDemo() {
    writeDemoSave()
    loadSave()
  }

  return (
    <div className="hp">
      {/* 背景层：整块向左无限平移（星空/云/山/树都在这层），文字在 hp-content 不动 */}
      <div className="hp-scroll">
        <div className="hp-sky">
          <div className="hp-stars">{STARS.map((s, i) => <i key={i} style={s} />)}</div>
        </div>
        <div className="hp-clouds" />
        <div className="hp-mountains">
          <div className="hp-mountain hp-mountain-far" />
          <div className="hp-mountain hp-mountain-mid" />
          <div className="hp-mountain hp-mountain-near" />
        </div>
        <div className="hp-trees" />
      </div>

      {/* 前景内容 */}
      <div className="hp-content">
        <div className="hp-title-wrap">
          <span className="hp-leaf hp-leaf-l" />
          <h1 className="hp-title">WORDWORLD</h1>
          <span className="hp-leaf hp-leaf-r" />
        </div>
        <p className="hp-slogan-en">Type in English, build your world.</p>
        <p className="hp-slogan-cn">用英文描述，搭出你的世界</p>

        {/* 存档区：四种状态 */}
        <div className="hp-save-zone">
          {saveState === 'loading' && (
            <div className="hp-save-box">
              <div className="hp-spinner" />
              <p>正在读取存档… Loading save…</p>
            </div>
          )}

          {saveState === 'success' && saveData && (
            <div className="hp-save-box hp-save-ok">
              <p className="hp-save-name">{saveData.worldName || '未命名世界 / Unnamed World'}</p>
              <p className="hp-save-meta">
                {saveData.items.length} 个物体 · {saveData.savedAt || '未知时间'} · {saveSizeKB()}
              </p>
              <button className="hp-btn hp-btn-primary" onClick={onStart}>
                继续上次 · Continue
              </button>
            </div>
          )}

          {saveState === 'empty' && (
            <div className="hp-save-box">
              <p className="hp-save-hint">🌱 还没有存档，从一句英文开始吧 · No save yet</p>
              <button className="hp-btn hp-btn-primary" onClick={onStart}>
                开始建造 · Start Building
              </button>
            </div>
          )}

          {saveState === 'error' && (
            <div className="hp-save-box hp-save-err">
              <p>⚠ 存档好像损坏了，读不出来 · Save file corrupted</p>
              <button className="hp-btn hp-btn-danger" onClick={handleClearSave}>
                清空重开 · Reset Save
              </button>
            </div>
          )}
        </div>

        {/* 空状态/无存档时主按钮也要可见（AC-1：开始建造始终可见） */}
        {saveState === 'success' && (
          <button className="hp-btn hp-btn-secondary" onClick={onStart}>
            开始新世界 · New World
          </button>
        )}

        {/* 次要入口 */}
        <div className="hp-links">
          <button className="hp-link" onClick={() => setShowVocabTip(!showVocabTip)}>
            添加词库 · Vocabulary
          </button>
          <button className="hp-link" onClick={onWorld}>
            我的世界 · My World
          </button>
        </div>
        {showVocabTip && (
          <p className="hp-vocab-tip">词库管理将在后续版本开放 · Coming in a later version</p>
        )}
      </div>

      {/* 演示模拟器（验证四状态用，第 3 周移除） */}
      <div className="hp-demo">
        <span className="hp-demo-label">演示 Demo：</span>
        <button className="hp-demo-btn" onClick={loadSave}>重新加载</button>
        <button className="hp-demo-btn" onClick={handleWriteDemo}>写入示例存档</button>
        <button className="hp-demo-btn" onClick={handleClearSave}>清空存档</button>
        <button className="hp-demo-btn" onClick={() => setSaveState('error')}>模拟损坏</button>
      </div>
    </div>
  )
}

// 星星位置。背景层 hp-scroll 宽 200%（两屏），left 用 0~100% 覆盖整条滚动带，
// 这样循环平移时右半边也有星星，不会出现断档。
const STARS = [
  { left: '4%', top: '12%' }, { left: '8%', top: '30%' }, { left: '11%', top: '8%' },
  { left: '15%', top: '22%' }, { left: '19%', top: '6%' }, { left: '23%', top: '16%' },
  { left: '26%', top: '10%' }, { left: '30%', top: '20%' }, { left: '34%', top: '7%' },
  { left: '37%', top: '25%' }, { left: '41%', top: '12%' }, { left: '45%', top: '28%' },
  { left: '6%', top: '45%' }, { left: '42%', top: '42%' }, { left: '25%', top: '32%' },
  { left: '13%', top: '38%' }, { left: '35%', top: '36%' }, { left: '47%', top: '8%' },
  { left: '52%', top: '12%' }, { left: '58%', top: '30%' }, { left: '61%', top: '8%' },
  { left: '65%', top: '22%' }, { left: '69%', top: '6%' }, { left: '73%', top: '16%' },
  { left: '76%', top: '10%' }, { left: '80%', top: '20%' }, { left: '84%', top: '7%' },
  { left: '87%', top: '25%' }, { left: '91%', top: '12%' }, { left: '95%', top: '28%' },
  { left: '56%', top: '45%' }, { left: '92%', top: '42%' }, { left: '75%', top: '32%' },
  { left: '63%', top: '38%' }, { left: '85%', top: '36%' }, { left: '97%', top: '8%' },
]
