import { useRef, useState, useEffect, useCallback } from 'react'
import WorldScene2D from './scenes/WorldScene2D.jsx'
import HomePage from './pages/HomePage.jsx'
import MyWorldView from './pages/MyWorldView.jsx'
import { buildCandidates, typeLabel, colorLabel } from './ai/dictionary.js'
import { writeSave } from './utils/saveStorage.js'
import { readFontScale, writeFontScale, FONT_SCALE_MIN, FONT_SCALE_MAX } from './utils/fontScale.js'

export default function App() {
  const [view, setView] = useState('start')
  const [fontScale, setFontScale] = useState(readFontScale)

  // 字号缩放同步到根元素，供 CSS 使用（界面文字用 rem/em 会随它缩放）
  useEffect(() => {
    document.documentElement.style.setProperty('--ui-scale', fontScale)
  }, [fontScale])

  function handleFontScale(v) {
    setFontScale(v)
    writeFontScale(v)
  }

  if (view === 'start') {
    return <HomePage onStart={() => setView('editor')} onWorld={() => setView('world')} />
  }
  if (view === 'world') {
    return <MyWorldView onBack={() => setView('start')} />
  }
  return (
    <EditorPage
      onBack={() => setView('start')}
      fontScale={fontScale}
      onFontScale={handleFontScale}
    />
  )
}

function EditorPage({ onBack, fontScale, onFontScale }) {
  const sceneRef = useRef(null)
  const [input, setInput] = useState('')
  const [message, setMessage] = useState('')
  const [showHelp, setShowHelp] = useState(false)
  const [candidates, setCandidates] = useState([])
  const [selected, setSelected] = useState(null)
  const [sideWidth, setSideWidth] = useState(280) // 右侧栏宽度，可拖动分隔线调整
  const [saveToast, setSaveToast] = useState('') // 保存提醒文字，空=不显示

  // 拖动分隔线调整侧栏宽度（200 ~ 520px）
  function startResize(e) {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = sideWidth
    function onMove(ev) {
      // 侧栏在右侧，往左拖（x 变小）→ 侧栏变宽
      const next = startWidth + (startX - ev.clientX)
      setSideWidth(Math.min(520, Math.max(200, next)))
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.classList.remove('resizing')
    }
    document.body.classList.add('resizing')
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  function handleGenerate() {
    const text = input.trim()
    if (/[一-鿿]/.test(text)) {
      setMessage('请用英文描述 · Please describe in English')
      return
    }
    const wordCount = text.split(/\s+/).filter(Boolean).length
    if (wordCount < 2) {
      setMessage('请写得更完整，比如 a red tree · Try a fuller phrase like "a red tree"')
      return
    }
    const list = buildCandidates(text)
    if (!list || list.length === 0) {
      setMessage('基础模式：还没认出来这些词，试试 a red tree / a big house / a tiny cat')
      return
    }
    setCandidates(list)
    setMessage('候选已出现，挑一个拖到场景里 · Pick one and drag it into the scene')
  }

  function onSceneDrop(e) {
    e.preventDefault()
    if (!sceneRef.current) return
    const idx = parseInt(e.dataTransfer.getData('text/plain'), 10)
    if (isNaN(idx) || !candidates[idx]) return
    const params = candidates[idx]
    const pos = sceneRef.current.screenToWorld(e.clientX, e.clientY)
    const obj = sceneRef.current.spawn(params, pos)
    // 清除预览
    sceneRef.current.setHoverPoint(0, 0, false)
    setCandidates([])
    setSelected({ ...obj.userData })
    setMessage('已放置 ' + typeLabel(params.type) + '，可继续改颜色/大小 · Placed ' + typeLabel(params.type))
  }

  function onSceneDragOver(e) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    // 更新落点预览
    if (sceneRef.current) {
      sceneRef.current.setHoverPoint(e.clientX, e.clientY, true)
    }
  }

  function onSceneDragLeave(e) {
    // 拖离场景时清除预览
    if (sceneRef.current) {
      sceneRef.current.setHoverPoint(0, 0, false)
    }
  }

  function deleteSelected() {
    if (sceneRef.current && selected) {
      const done = sceneRef.current.deleteSelected()
      if (done) {
        setMessage('已删除 · Deleted')
        setSelected(null)
      }
    }
  }

  // 真保存：把场景里的物体写进 localStorage，弹「已保存✓」提醒，2 秒后自动消失
  function handleSave() {
    if (!sceneRef.current) {
      setSaveToast('还没有场景，无法保存')
      return
    }
    const objects = sceneRef.current.getObjects ? sceneRef.current.getObjects() : []
    const result = writeSave(objects)
    if (result.ok) {
      setSaveToast('已保存 ✓ Saved')
    } else {
      setSaveToast('保存失败，存储空间可能不足')
    }
    setTimeout(() => setSaveToast(''), 2000)
  }

  function changeColor(hex) {
    if (sceneRef.current && selected) {
      sceneRef.current.updateSelected({ color: hex })
    }
  }

  function changeScale(scale) {
    if (sceneRef.current && selected) {
      sceneRef.current.updateSelected({ scale })
    }
  }

  function changeStyle() {
    if (sceneRef.current && selected) {
      sceneRef.current.nextVariant()
    }
  }

  const onSelectChange = useCallback((info) => {
    setSelected(info)
  }, [])

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.onSelectChange = onSelectChange
    }
  }, [onSelectChange])

  return (
    <div className="editor">
      <header className="editor-topbar">
        <button className="topbar-btn" onClick={onBack} title="回到主界面 · Back to home">
          ← 主界面
        </button>
        <span className="editor-logo">WordWorld</span>
        <div className="editor-topbar-right">
          <button className="topbar-btn" onClick={handleSave}>
            保存 · Save
          </button>
          <button className="topbar-btn" onClick={() => setShowHelp(true)}>
            帮助 · Help
          </button>
          <label className="font-scale" title="调整字体大小 · Adjust text size">
            <span className="font-scale-label">Aa</span>
            <input
              className="font-scale-slider"
              type="range"
              min={FONT_SCALE_MIN}
              max={FONT_SCALE_MAX}
              step={0.05}
              value={fontScale}
              onChange={(e) => onFontScale(parseFloat(e.target.value))}
            />
          </label>
        </div>
      </header>

      {saveToast && <div className="save-toast">{saveToast}</div>}

      <div className="editor-main">
        <div
          className="editor-scene"
          onDrop={onSceneDrop}
          onDragOver={onSceneDragOver}
          onDragLeave={onSceneDragLeave}
        >
          <WorldScene2D sceneRef={sceneRef} fontScale={fontScale} />
        </div>

        <div className="editor-resizer" onMouseDown={startResize} title="拖动调整宽度 · Drag to resize" />

        <div className="editor-side" style={{ width: sideWidth }}>
          <span className="editor-hint">WASD/方向键移动 · 输入英文造物 · 点击物体编辑</span>
          <div className="editor-input">
            <input
              className="editor-input-field"
              placeholder="Type in English… 例如 a red tree"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            />
            <button className="editor-input-btn" onClick={handleGenerate}>
              生成 · Generate
            </button>
          </div>

          {message && <div className="editor-message">{message}</div>}

          {candidates.length > 0 && (
            <div className="candidate-panel">
              <h3>候选 · Candidates</h3>
              <div className="candidate-list">
                {candidates.map((c, i) => (
                  <div
                    key={i}
                    className="candidate-card"
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', i)}
                  >
                    <div
                      className="candidate-swatch"
                      style={{ backgroundColor: colorHex(c.color) }}
                    />
                    <div className="candidate-info">
                      <span className="candidate-type">{typeLabel(c.type)}</span>
                      <span className="candidate-color">{colorLabel(c.color)}</span>
                      <span className="candidate-scale">size {c.scale.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selected && (
            <div className="prop-panel">
              <h3>属性 · Properties</h3>
              <div className="prop-row">
                <span className="prop-label">类型 Type</span>
                <span className="prop-value">{typeLabel(selected.type)}</span>
              </div>
              <div className="prop-row">
                <span className="prop-label">颜色 Color</span>
                <div className="color-swatches">
                  {[0xff4d4d, 0x4caf50, 0x42a5f5, 0xffd54f, 0xf48fb1, 0xab47bc, 0xff9800, 0xffffff, 0x424242, 0x8d6e63, 0x9e9e9e, 0x00695c].map((c) => (
                    <button
                      key={c}
                      className={selected.color === c ? 'swatch active' : 'swatch'}
                      style={{ backgroundColor: colorHex(c) }}
                      onClick={() => changeColor(c)}
                      title={colorLabel(c)}
                    />
                  ))}
                </div>
              </div>
              <div className="prop-row">
                <span className="prop-label">大小 Size</span>
                <div className="scale-controls">
                  <button className="scale-btn" onClick={() => changeScale(Math.max(0.3, selected.scale - 0.1))}>-</button>
                  <span className="scale-value">{selected.scale.toFixed(1)}</span>
                  <button className="scale-btn" onClick={() => changeScale(Math.min(3, selected.scale + 0.1))}>+</button>
                </div>
              </div>
              <button className="prop-btn prop-style" onClick={changeStyle}>
                换样式 · Restyle {variantCount(selected.type) > 1 ? `（${(selected.variant || 0) + 1}/${variantCount(selected.type)}）` : ''}
              </button>
              <button className="prop-btn prop-delete" onClick={deleteSelected}>
                删除 · Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  )
}

function variantCount(type) {
  const counts = { tree: 3, house: 2, rock: 2, mountain: 2 }
  return counts[type] || 1
}

function colorHex(num) {
  return '#' + num.toString(16).padStart(6, '0')
}

function HelpModal({ onClose }) {
  return (
    <div className="help-mask" onClick={onClose}>
      <div className="help-card" onClick={(e) => e.stopPropagation()}>
        <div className="help-header">
          <h2>新手操作指导 · Quick Guide</h2>
          <button className="help-close" onClick={onClose}>×</button>
        </div>
        <div className="help-body">
          <p className="help-lead">核心：用英文描述一个东西，它就会出现在世界里；用键盘控制小人走动。</p>
          <ul className="help-list">
            <li><b>1. 移动</b> · 按 <kbd>WASD</kbd> 或 <kbd>方向键</kbd> 控制小人走动。</li>
            <li><b>2. 造东西</b> · 在上方输入框写英文（例如 <code>a red tree</code>），按回车，候选会出现在右侧。</li>
            <li><b>3. 放置</b> · 把右侧候选卡片拖到场景中，松手放置。</li>
            <li><b>4. 编辑</b> · 点击场景中的物体，右侧出现属性面板，可改颜色、大小、删除。</li>
            <li><b>5. 认得的词</b> · 颜色：red / blue / green / pink… 大小：big / tiny / giant… 东西：tree / house / cat / dog / ball / rock / rabbit / bird / fish / bear / snake / butterfly / apple / cake / ice cream / pumpkin / chair / table / bed / bench / mailbox / sun / moon / star / snowman / rainbow / cactus…</li>
          </ul>
          <p className="help-tip">写错了没关系，改一改再试一次就行。</p>
        </div>
      </div>
    </div>
  )
}