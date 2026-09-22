import { useEffect, useRef, useState } from 'react'
import WorldScene from './scenes/WorldScene.jsx'
import { buildCandidates, typeLabel, colorLabel, COLORS } from './ai/dictionary.js'

export default function App() {
  const [view, setView] = useState('start') // 'start' | 'editor'

  if (view === 'start') {
    return <StartPage onStart={() => setView('editor')} />
  }
  return <EditorPage />
}

function StartPage({ onStart }) {
  return (
    <div className="start-page">
      <div className="start-card">
        <h1 className="start-title">WordWorld</h1>
        <p className="start-en">Type in English, build your world.</p>
        <p className="start-cn">用英文描述，搭出你的世界</p>
        <div className="start-actions">
          <button className="btn-primary" onClick={onStart}>
            开始建造 · Start Building
          </button>
          <button className="btn-disabled" disabled title="暂无存档 / No save yet">
            继续上次 · Continue
          </button>
        </div>
      </div>
    </div>
  )
}

function EditorPage() {
  const sceneRef = useRef(null)
  const [input, setInput] = useState('')
  const [message, setMessage] = useState('')
  const [showHelp, setShowHelp] = useState(false)
  const [candidates, setCandidates] = useState([])
  const [mode, setMode] = useState('translate') // translate | rotate | scale
  const [selected, setSelected] = useState(null) // 当前选中物体的 {type,color,scale}

  function handleGenerate() {
    const text = input.trim()
    // 1. 非英文检查（AC-20）：含中文则提示
    if (/[\u4e00-\u9fff]/.test(text)) {
      setMessage('请用英文描述 · Please describe in English')
      setCandidates([])
      return
    }
    // 2. 少于 2 个单词不提交（AC-21）
    const wordCount = text.split(/\s+/).filter(Boolean).length
    if (wordCount < 2) {
      setMessage('请写得更完整，比如 a red tree · Try a fuller phrase like "a red tree"')
      setCandidates([])
      return
    }
    // 3. 生成候选变体
    const list = buildCandidates(text)
    if (list.length === 0) {
      setMessage(
        '基础模式：还没认出来这些词，试试 a red tree / a castle / a tiny cat · Basic mode: word not recognized'
      )
      setCandidates([])
      return
    }
    setCandidates(list)
    setMessage(
      '挑一个拖进场景 · Pick one and drag it into the scene'
    )
  }

  // 候选卡片拖拽开始：记录要生成的参数
  function onDragStart(e, candidate) {
    e.dataTransfer.setData('application/json', JSON.stringify(candidate))
    e.dataTransfer.effectAllowed = 'copy'
  }

  // 拖到场景上松手：在鼠标位置生成物体
  function onSceneDrop(e) {
    e.preventDefault()
    const raw = e.dataTransfer.getData('application/json')
    if (!raw || !sceneRef.current) return
    const candidate = JSON.parse(raw)
    const pos = sceneRef.current.groundPointAt(e.clientX, e.clientY)
    sceneRef.current.spawn(candidate, pos)
    setMessage(
      '已放置 ' + typeLabel(candidate.type) + ' · Placed ' + typeLabel(candidate.type)
    )
  }

  function onSceneDragOver(e) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  // 切换变换模式
  function switchMode(m) {
    setMode(m)
    if (sceneRef.current) sceneRef.current.setMode(m)
  }

  // 场景选中变化 → 同步属性面板
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.onSelectChange = (info) => setSelected(info)
    }
  }, [])

  // 删除选中物体
  function deleteSelected() {
    if (sceneRef.current) {
      const done = sceneRef.current.deleteSelected()
      if (done) {
        setMessage('已删除 · Deleted')
        setSelected(null)
      }
    }
  }

  // 改颜色
  function changeColor(hex) {
    if (sceneRef.current) {
      const next = sceneRef.current.updateSelected({ color: hex })
      if (next) setSelected(next)
    }
  }

  // 改大小
  function changeScale(scale) {
    if (sceneRef.current) {
      const next = sceneRef.current.updateSelected({ scale })
      if (next) setSelected(next)
    }
  }

  // 切样式（在多造型之间循环切换）
  function changeStyle() {
    if (sceneRef.current && selected) {
      const next = sceneRef.current.nextVariant()
      if (next) setSelected(next)
    }
  }

  return (
    <div className="editor">
      <header className="editor-topbar">
        <span className="editor-logo">WordWorld</span>
        <div className="editor-topbar-right">
          <button className="topbar-btn" onClick={() => setShowHelp(true)}>
            帮助 · Help
          </button>
          <span className="editor-hint">点选物体编辑 · Click object to edit</span>
        </div>
      </header>

      <div className="editor-scene" onDrop={onSceneDrop} onDragOver={onSceneDragOver}>
        <WorldScene sceneRef={sceneRef} />
        <div className="editor-toolbar">
          <button
            className={mode === 'translate' ? 'tool-btn active' : 'tool-btn'}
            onClick={() => switchMode('translate')}
            title="移动 / Move"
          >
            移动
          </button>
          <button
            className={mode === 'rotate' ? 'tool-btn active' : 'tool-btn'}
            onClick={() => switchMode('rotate')}
            title="旋转 / Rotate"
          >
            旋转
          </button>
          <button
            className={mode === 'scale' ? 'tool-btn active' : 'tool-btn'}
            onClick={() => switchMode('scale')}
            title="缩放 / Scale"
          >
            缩放
          </button>
          <button className="tool-btn danger" onClick={deleteSelected} title="删除选中 / Delete selected">
            删除
          </button>
        </div>
      </div>

      {selected && (
        <div className="prop-panel">
          <div className="prop-title">属性 · Properties</div>
          <div className="prop-item">
            <span className="prop-label">类型 · Type</span>
            <span className="prop-value">{typeLabel(selected.type)}</span>
          </div>
          <div className="prop-item">
            <span className="prop-label">颜色 · Color</span>
            <div className="prop-colors">
              {Object.values(COLORS).filter((v, i, a) => a.indexOf(v) === i).slice(0, 12).map((hex) => (
                <button
                  key={hex}
                  className={'color-swatch' + (selected.color === hex ? ' active' : '')}
                  style={{ background: colorHex(hex) }}
                  onClick={() => changeColor(hex)}
                  title={colorLabel(hex)}
                />
              ))}
            </div>
          </div>
          <div className="prop-item">
            <span className="prop-label">大小 · Scale</span>
            <div className="prop-scale">
              <button className="prop-btn" onClick={() => changeScale(Math.max(0.3, selected.scale - 0.2))}>−</button>
              <span className="prop-scale-value">{selected.scale.toFixed(1)}×</span>
              <button className="prop-btn" onClick={() => changeScale(Math.min(3, selected.scale + 0.2))}>+</button>
            </div>
          </div>
          <button className="prop-btn prop-style" onClick={changeStyle}>
            换样式 · Restyle{selected.variant !== undefined && variantCount(selected.type) > 1 ? `（${selected.variant + 1}/${variantCount(selected.type)}）` : ''}
          </button>
          <button className="prop-btn prop-delete" onClick={deleteSelected}>
            删除 · Delete
          </button>
        </div>
      )}

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

      {candidates.length > 0 && (
        <div className="candidate-panel">
          <div className="candidate-title">候选 · Candidates（拖进场景）</div>
          <div className="candidate-list">
            {candidates.map((c) => (
              <div
                key={c.id}
                className="candidate-card"
                draggable
                onDragStart={(e) => onDragStart(e, c)}
              >
                <span className="candidate-swatch" style={{ background: colorHex(c.color) }} />
                <span className="candidate-label">{typeLabel(c.type)}</span>
                <span className="candidate-scale">{scaleLabel(c.scale)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {message && <div className="editor-message">{message}</div>}

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  )
}

/** 数字色值 → css 颜色字符串 */
function colorHex(num) {
  return '#' + num.toString(16).padStart(6, '0')
}

/** 某类型有多少种造型（与 WorldScene 里保持一致） */
function variantCount(type) {
  const multi = { tree: 3, house: 2, rock: 2, mountain: 2 }
  return multi[type] || 1
}

/** 缩放倍数 → 中文大小标签 */
function scaleLabel(scale) {
  if (scale < 0.7) return '小'
  if (scale > 1.5) return '大'
  return '中'
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
          <p className="help-lead">核心一句话：用英文描述一个东西，再把它拖进你的世界。</p>
          <ul className="help-list">
            <li><b>1. 转视角</b> · 按住鼠标左键拖动旋转，滚轮拉近拉远。</li>
            <li><b>2. 造东西</b> · 在右上角输入框写英文（例如 <code>a red tree</code>），回车或点「生成」。</li>
            <li><b>3. 拖进场景</b> · 右边出现候选，挑一个拖到场景里松手。</li>
            <li><b>4. 认得的词</b> · 颜色：red / blue / pink… 大小：big / tiny… 东西：tree / castle / house / cat / car…</li>
          </ul>
          <p className="help-tip">写错了没关系，改一改再试一次就行。</p>
        </div>
      </div>
    </div>
  )
}

