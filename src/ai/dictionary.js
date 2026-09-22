/**
 * dictionary.js — 词典兜底（D2 定稿：本地词典为主，数据不出本机）
 *
 * 这是「基础模式」的核心：不下载任何 AI 模型，纯靠一个内置词典，
 * 把英文描述解析成「素材类型 + 颜色 + 尺寸」参数。
 *
 * 扩展方式：想认识新词，直接往下面三个对象里加条目即可——
 *   COLORS 加颜色词、TYPES 加素材类型（需同时在 WorldScene.jsx 的 BUILDERS 里登记造物函数）、SIZES 加大小词。
 * 本期只认少数预设词，Week 2 接上本地小模型后再扩展。
 */

// 颜色词 → Three.js 色值
const COLORS = {
  red: 0xff4d4d,
  green: 0x4caf50,
  blue: 0x42a5f5,
  yellow: 0xffd54f,
  pink: 0xf48fb1,
  purple: 0xab47bc,
  orange: 0xff9800,
  white: 0xffffff,
  black: 0x424242,
  brown: 0x8d6e63,
  gray: 0x9e9e9e,
  grey: 0x9e9e9e,
}

// 素材类型 → 生成方式
const TYPES = {
  tree: 'tree',
  trees: 'tree',
  house: 'house',
  houses: 'house',
  cube: 'cube',
  box: 'cube',
  ball: 'ball',
  sphere: 'ball',
  rock: 'rock',
  stone: 'rock',
  cat: 'cat',
  dog: 'dog',
}

// 尺寸词 → 缩放倍数
const SIZES = {
  big: 1.6,
  large: 1.6,
  huge: 2.2,
  giant: 2.2,
  tiny: 0.5,
  small: 0.6,
  little: 0.6,
}

/**
 * 解析英文描述 → 参数对象；解析不出时返回 null（触发"基础模式"提示）
 * @param {string} text 用户输入，如 "a red tree" / "a big blue house"
 * @returns {{type: string, color: number, scale: number} | null}
 */
export function parseDescription(text) {
  if (!text) return null
  const words = text.toLowerCase().split(/[^a-z]+/).filter(Boolean)
  if (words.length === 0) return null

  let type = null
  let color = null
  let scale = 1

  for (const w of words) {
    if (COLORS[w] !== undefined) color = COLORS[w]
    if (SIZES[w] !== undefined) scale = SIZES[w]
    if (TYPES[w]) type = TYPES[w]
  }

  if (!type) return null // 没认出任何素材类型 → 超出词典能力
  if (color === null) color = 0x4caf50 // 默认绿色（和树一个色）

  return { type, color, scale }
}

/** 判断输入里是否至少有一个能认出的词（用于提示） */
export function hasKnownWord(text) {
  if (!text) return false
  const words = text.toLowerCase().split(/[^a-z]+/).filter(Boolean)
  return words.some(
    (w) => COLORS[w] !== undefined || SIZES[w] !== undefined || TYPES[w]
  )
}
