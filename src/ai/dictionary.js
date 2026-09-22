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
  cyan: 0x26c6da,
  teal: 0x009688,
  gold: 0xffc107,
  silver: 0xc0c0c0,
  violet: 0x7c4dff,
  dark: 0x263238,
  light: 0xeeeeee,
}

// 素材类型 → 生成方式
const TYPES = {
  tree: 'tree',
  trees: 'tree',
  house: 'house',
  houses: 'house',
  home: 'house',
  cube: 'cube',
  box: 'cube',
  block: 'cube',
  ball: 'ball',
  sphere: 'ball',
  rock: 'rock',
  stone: 'rock',
  cat: 'cat',
  dog: 'dog',
  castle: 'castle',
  tower: 'tower',
  bridge: 'bridge',
  flower: 'flower',
  mountain: 'mountain',
  hill: 'mountain',
  cloud: 'cloud',
  car: 'car',
  boat: 'boat',
  ship: 'boat',
  mushroom: 'mushroom',
  fence: 'fence',
  lamp: 'lamp',
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
  medium: 1.0,
  tall: 1.8,
  wide: 1.6,
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

/**
 * 生成候选变体列表（供"输入 → 候选栏 → 拖拽"交互用）
 * 解析出类型后，按用户指定的颜色/大小生成一组候选，让用户挑。
 * 若用户没指定颜色，就给出几个常见配色；没指定大小就给几个尺寸。
 */
export function buildCandidates(text) {
  const words = (text || '').toLowerCase().split(/[^a-z]+/).filter(Boolean)
  let type = null
  let color = null
  let scale = 1
  for (const w of words) {
    if (COLORS[w] !== undefined) color = COLORS[w]
    if (SIZES[w] !== undefined) scale = SIZES[w]
    if (TYPES[w]) type = TYPES[w]
  }
  if (!type) return [] // 认不出类型 → 无候选

  // 颜色候选：用户指定了就用它（配深浅两档）；没指定就给一组常用色
  const colorOptions = color !== null
    ? [color, color]
    : [0xff4d4d, 0x4caf50, 0x42a5f5, 0xffd54f, 0xf48fb1]

  // 尺寸候选：用户指定了大小就用它（配一个更小档）；没指定给三档
  const scaleOptions = scale !== 1
    ? [scale, Math.max(0.4, scale * 0.6)]
    : [1, 0.6, 1.8]

  const candidates = []
  colorOptions.forEach((c, ci) => {
    scaleOptions.forEach((s, si) => {
      candidates.push({
        id: `${type}-${ci}-${si}`,
        type,
        color: c,
        scale: s,
      })
    })
  })
  return candidates
}

/** 把类型名翻译成「中文 + 英文」展示名（帮助页 / 候选栏用） */
export function typeLabel(type) {
  const names = {
    tree: '树 / Tree',
    house: '房子 / House',
    cube: '方块 / Cube',
    ball: '球 / Ball',
    rock: '石头 / Rock',
    cat: '猫 / Cat',
    dog: '狗 / Dog',
    castle: '城堡 / Castle',
    tower: '塔 / Tower',
    bridge: '桥 / Bridge',
    flower: '花 / Flower',
    mountain: '山 / Mountain',
    cloud: '云 / Cloud',
    car: '车 / Car',
    boat: '船 / Boat',
    mushroom: '蘑菇 / Mushroom',
    fence: '栅栏 / Fence',
    lamp: '灯 / Lamp',
  }
  return names[type] || type
}

/** 颜色值 → 中文名（属性面板用） */
export function colorLabel(hex) {
  const map = {
    0xff4d4d: '红', 0x4caf50: '绿', 0x42a5f5: '蓝', 0xffd54f: '黄',
    0xf48fb1: '粉', 0xab47bc: '紫', 0xff9800: '橙', 0xffffff: '白',
    0x424242: '黑', 0x8d6e63: '棕', 0x9e9e9e: '灰', 0x26c6da: '青',
    0x009688: '墨绿', 0xffc107: '金', 0xc0c0c0: '银', 0x7c4dff: '紫罗兰',
  }
  return map[hex] || '自定义'
}

export { COLORS, TYPES, SIZES }
