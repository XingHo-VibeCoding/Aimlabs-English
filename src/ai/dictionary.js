/**
 * dictionary.js — 词典（素材大整合版）
 *
 * 输入英文 → 解析成「类型 + 颜色词 + 大小」。
 * 颜色词不再改色，而是**选对应素材变体**（a blue chicken → 蓝鸡素材）；
 * 没有对应素材的颜色保持原词交给场景兜底。
 *
 * 2026-10 素材整合：删除全部无素材类型（等 LoRA 自产素材后补回），
 * 新增鸡/牛/猪/羊/山羊/鸵鸟/恐龙 + 谷仓/棚屋/温室/黄金钟/灌木/草丛。
 */

// 颜色词 → 色值（展示用；素材命中见 spriteRegistry 的 COLOR_VARIANT）
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
  golden: 0xffc107,
  silver: 0xc0c0c0,
  violet: 0x7c4dff,
  dark: 0x263238,
  light: 0xeeeeee,
}

// 素材类型 → 注册名（须与 spriteRegistry 的 SPRITES/ANIMALS 对齐）
const TYPES = {
  tree: 'tree',
  trees: 'tree',
  house: 'house',
  houses: 'house',
  home: 'house',
  rock: 'rock',
  stone: 'rock',
  cat: 'cat',
  kitty: 'cat',
  dog: 'dog',
  puppy: 'dog',
  rabbit: 'rabbit',
  bunny: 'rabbit',
  fish: 'fish',
  tower: 'tower',
  bridge: 'bridge',
  flower: 'flower',
  mushroom: 'mushroom',
  fence: 'fence',
  boat: 'boat',
  ship: 'boat',
  bush: 'bush',
  shrub: 'bush',
  grass: 'grass',
  chicken: 'chicken',
  hen: 'chicken',
  cow: 'cow',
  pig: 'pig',
  piglet: 'pig',
  sheep: 'sheep',
  lamb: 'sheep',
  goat: 'goat',
  ostrich: 'ostrich',
  dinosaur: 'dinosaur',
  dino: 'dinosaur',
  barn: 'barn',
  shed: 'shed',
  greenhouse: 'greenhouse',
  clock: 'goldclock',
  chair: 'chair',
  table: 'table',
  bed: 'bed',
  bench: 'bench',
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

function parseWords(text) {
  const words = (text || '').toLowerCase().split(/[^a-z]+/).filter(Boolean)
  let type = null
  let color = null
  let colorWord = ''
  let scale = 1
  for (const w of words) {
    if (COLORS[w] !== undefined) { color = COLORS[w]; colorWord = w }
    if (SIZES[w] !== undefined) scale = SIZES[w]
    if (TYPES[w]) type = TYPES[w]
  }
  return { words, type, color, colorWord, scale }
}

/**
 * 解析英文描述 → 参数对象；解析不出时返回 null
 * @returns {{type: string, color: number, colorWord: string, scale: number, variant: number} | null}
 */
export function parseDescription(text) {
  if (!text) return null
  const { type, color, colorWord, scale } = parseWords(text)
  if (!type) return null
  return {
    type,
    color: color === null ? 0x4caf50 : color,
    colorWord,
    scale,
    variant: 0,
  }
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
 * 生成候选变体列表（输入 → 候选栏 → 拖拽）
 * 有颜色词就锁定该色变体；没给就轮换不同素材变体 + 配色。
 */
export function buildCandidates(text) {
  const { type, color, colorWord, scale } = parseWords(text)
  if (!type) return []

  const colorWords = colorWord ? [colorWord, colorWord, colorWord] : ['', '', '']
  const colorValues =
    color !== null ? [color, color, color] : [0x4caf50, 0xff9800, 0x42a5f5]
  const scales = scale !== 1 ? [scale, scale, scale] : [1, 0.6, 1.8]

  return colorWords.map((cw, i) => ({
    id: `${type}-${i}`,
    type,
    color: colorValues[i],
    colorWord: cw,
    scale: scales[i],
    variant: i, // 没颜色词时靠 variant 轮换素材变体
  }))
}

/** 类型 → 展示名 */
export function typeLabel(type) {
  const names = {
    tree: '树 / Tree',
    house: '房子 / House',
    rock: '石头 / Rock',
    cat: '猫 / Cat',
    dog: '狗 / Dog',
    rabbit: '兔子 / Rabbit',
    fish: '鱼 / Fish',
    tower: '塔 / Tower',
    bridge: '桥 / Bridge',
    flower: '花 / Flower',
    mushroom: '蘑菇 / Mushroom',
    fence: '栅栏 / Fence',
    boat: '船 / Boat',
    bush: '灌木 / Bush',
    grass: '草丛 / Grass',
    chicken: '鸡 / Chicken',
    cow: '牛 / Cow',
    pig: '猪 / Pig',
    sheep: '羊 / Sheep',
    goat: '山羊 / Goat',
    ostrich: '鸵鸟 / Ostrich',
    dinosaur: '恐龙 / Dinosaur',
    barn: '谷仓 / Barn',
    shed: '棚屋 / Shed',
    greenhouse: '温室 / Greenhouse',
    goldclock: '黄金钟 / Gold Clock',
    chair: '椅子 / Chair',
    table: '桌子 / Table',
    bed: '床 / Bed',
    bench: '长椅 / Bench',
  }
  return names[type] || type
}

/** 颜色值 → 中文名 */
export function colorLabel(hex) {
  const map = {
    0xff4d4d: '红', 0x4caf50: '绿', 0x42a5f5: '蓝', 0xffd54f: '黄',
    0xf48fb1: '粉', 0xab47bc: '紫', 0xff9800: '橙', 0xffffff: '白',
    0x424242: '黑', 0x8d6e63: '棕', 0x9e9e9e: '灰', 0x26c6da: '青',
    0x009688: '墨绿', 0xffc107: '金', 0xc0c0c0: '银', 0x7c4dff: '紫罗兰',
    0xeeeeee: '浅色', 0x263238: '深色',
  }
  return map[hex] || '自定义'
}

export { COLORS, TYPES, SIZES }
