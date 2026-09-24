// saveStorage.js —— 本地存档读写工具（P0-5 本地存档的雏形）
// PRD §6.5：本期只保留 1 个存档，存浏览器 localStorage，key 固定
// 首页「读取存档」用 readSave；「清空重开」用 clearSave（PRD E6）
// writeDemoSave 仅用于演示「成功」状态，第 3 周编辑器实现真正保存后移除

export const SAVE_KEY = 'wordworld-save'

/**
 * 读取存档。返回值三选一：
 *   { ok: true,  data }  有存档且能解析
 *   { ok: false, reason: 'empty' }   没有存档
 *   { ok: false, reason: 'corrupted' } 存档损坏（JSON 解析失败或结构不对）
 */
export function readSave() {
  let raw = null
  try {
    raw = localStorage.getItem(SAVE_KEY)
  } catch {
    // 浏览器隐私模式等场景 localStorage 可能不可用，按无存档处理
    return { ok: false, reason: 'empty' }
  }
  if (!raw) return { ok: false, reason: 'empty' }

  try {
    const data = JSON.parse(raw)
    // 最基本的结构校验：要有 items 数组
    if (!data || typeof data !== 'object' || !Array.isArray(data.items)) {
      return { ok: false, reason: 'corrupted' }
    }
    return { ok: true, data }
  } catch {
    return { ok: false, reason: 'corrupted' }
  }
}

/** 写入真实存档：把编辑器场景里的物体 + 元数据存进 localStorage */
export function writeSave(items, worldName) {
  const data = {
    version: 1,
    worldName: worldName || '我的世界 / My World',
    savedAt: new Date().toISOString(),
    items: items.map((it) => ({
      id: it.userData.id || ('w' + Math.random().toString(36).slice(2, 8)),
      phrase: it.userData.phrase || '',
      type: it.userData.type,
      color: it.userData.color,
      scale: it.userData.scale,
      x: Math.round(it.x * 10) / 10,
      y: Math.round(it.y * 10) / 10,
    })),
  }
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data))
    return { ok: true }
  } catch {
    return { ok: false, reason: 'storage-full' }
  }
}

/** 清空存档（PRD E6「清空重开」、AC-33） */
export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch {
    // 忽略：清不掉也无需中断页面
  }
}

/** 写入一份示例存档（演示用），结构对齐 PRD §7.4 存档元数据的简化版 */
export function writeDemoSave() {
  const demo = {
    version: 1,
    worldName: '我的第一个世界 / My First World',
    savedAt: '2026-09-23 19:45',
    items: [
      { id: 's1', phrase: 'a red tree', type: 'tree', color: 0xff4d4d, scale: 1.0, x: 3, y: 4 },
      { id: 's2', phrase: 'a big house', type: 'house', color: 0xffffff, scale: 1.8, x: -2, y: 1 },
      { id: 's3', phrase: 'a tiny cat', type: 'cat', color: 0xf48fb1, scale: 0.5, x: 0, y: 2 },
    ],
  }
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(demo))
  } catch {
    // 空间不足等异常静默（真实保存是后续天的任务）
  }
}

/** 存档占用空间的粗略估算（KB），给成功状态的封面信息用（AC-32 精神） */
export function saveSizeKB() {
  try {
    const raw = localStorage.getItem(SAVE_KEY) || ''
    return (raw.length / 1024).toFixed(1) + ' KB'
  } catch {
    return '—'
  }
}
