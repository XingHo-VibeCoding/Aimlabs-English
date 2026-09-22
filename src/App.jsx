import { useRef, useState } from 'react'
import WorldScene from './scenes/WorldScene.jsx'
import { parseDescription, hasKnownWord } from './ai/dictionary.js'

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

  function handleGenerate() {
    const text = input.trim()
    // 1. 非英文检查（AC-20）：含中文则提示
    if (/[\u4e00-\u9fff]/.test(text)) {
      setMessage('请用英文描述 · Please describe in English')
      return
    }
    // 2. 少于 2 个单词不提交（AC-21）
    const wordCount = text.split(/\s+/).filter(Boolean).length
    if (wordCount < 2) {
      setMessage('请写得更完整，比如 a red tree · Try a fuller phrase like "a red tree"')
      return
    }
    // 3. 词典解析
    const params = parseDescription(text)
    if (!params) {
      setMessage(
        '基础模式：还没认出来这些词，试试 a red tree / a big house / a tiny cat · Basic mode: word not recognized'
      )
      return
    }
    // 4. 生成进场景
    if (sceneRef.current) {
      sceneRef.current.spawn(params)
      setMessage(
        '已生成！输入 "' + text + '" → ' + describeType(params.type) +
        ' · Spawned! ' + text + ' → ' + describeType(params.type)
      )
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
          <span className="editor-hint">拖动旋转 · 滚轮缩放 / Drag to orbit · Scroll to zoom</span>
        </div>
      </header>

      <div className="editor-scene">
        <WorldScene sceneRef={sceneRef} />
      </div>

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

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  )
}

function describeType(type) {
  const names = {
    tree: '一棵树 / a tree',
    house: '一座房子 / a house',
    cube: '一个方块 / a cube',
    ball: '一个球 / a ball',
    rock: '一块石头 / a rock',
    cat: '一只猫 / a cat',
    dog: '一只狗 / a dog',
  }
  return names[type] || type
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
          <p className="help-lead">核心一句话：用英文描述一个东西，它就会出现在世界里。</p>
          <ul className="help-list">
            <li><b>1. 转视角</b> · 按住鼠标左键拖动旋转，滚轮拉近拉远。</li>
            <li><b>2. 造东西</b> · 在右上角输入框写英文（例如 <code>a red tree</code>），按回车或点「生成」。</li>
            <li><b>3. 认得的词</b> · 颜色：red / blue / green / pink… 大小：big / tiny / giant… 东西：tree / house / cat / dog / ball / rock。</li>
            <li><b>4. 能力边界</b> · 这一版是「变体」：改颜色和大小，不是凭空造新模型。</li>
          </ul>
          <p className="help-tip">写错了没关系，改一改再试一次就行。</p>
        </div>
      </div>
    </div>
  )
}
