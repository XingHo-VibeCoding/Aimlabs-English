/**
 * spriteRegistry.js — 游戏素材登记表（唯一出处）
 *
 * 三类素材：
 *   1. SPRITES  静态贴图（树/建筑/家具/植物…），每类一个数组 = 变体列表，下标即 variant
 *   2. ANIMALS  动物（走路动画帧，animals/<文件夹>/r00_c0帧.png，4 帧循环）
 *   3. PLAYER   主角 Abigail（16x32，下/右/上三朝向各 4 帧，左 = 右镜像）
 *
 * 所有路径相对 /sprites/（Vite public 目录）。版权素材，已 gitignore，不得提交。
 */

export const SPRITE_BASE = '/sprites'

// ---------- 静态贴图：类型 → 变体文件列表 ----------
export const SPRITES = {
  // 树：颜色词可直接命中（见 COLOR_VARIANT）
  tree: [
    'picked/tree_oak_green.png',   // 0 绿（默认）
    'picked/tree_orange.png',      // 1 橙
    'picked/tree_lush_green.png',  // 2 浓绿
    'picked/tree_yellow.png',      // 3 黄
    'picked/tree_pink.png',        // 4 粉
    'picked/tree_purple.png',      // 5 紫
    'picked/tree_red.png',         // 6 红
    'picked/tree_oak_orange.png',  // 7 秋橡
    'picked/tree_lush_orange.png', // 8 秋浓
    'picked/tree_pine.png',        // 9 松
    'picked/tree_pine_snow.png',   // 10 雪松
    'picked/tree_oak_snow.png',    // 11 雪橡（白）
    'picked/tree_palm.png',        // 12 棕榈
    'picked/tree_mushroom.png',    // 13 蘑菇树
    'picked/tree_mystic.png',      // 14 神秘蓝树
    'picked/tree_pot.png',         // 15 盆栽树
  ],
  rock: [
    'picked/rock_stone_big.png',   // 0 石笋（默认）
    'picked/rock_big.png',         // 1 圆岩
    'picked/rock_stone_small.png', // 2 小石
    'picked/rock_frost.png',       // 3 冰晶
    'picked/rock_lava.png',        // 4 熔岩
  ],
  house: [
    'buildings/beach_cabin/v1.png',
    'buildings/beach_cabin/v2.png',
    'buildings/beach_cabin/v3.png',
    'buildings/rustic_cabin/v1.png',
    'buildings/rustic_cabin/v2.png',
    'buildings/rustic_cabin/v3.png',
    'picked/house_blue.png',
  ],
  tower: ['picked/tower_wizard.png'],
  bridge: ['picked/bridge_wood.png'],
  fence: ['picked/fence_wood.png'],
  boat: ['picked/boat_row.png'],
  flower: [
    'picked/flower_box.png',
    'picked/plant_pot_big.png',
    'picked/plant_pot_small.png',
    'picked/cave_fern.png',
  ],
  mushroom: [
    'picked/mushroom_red_small.png',
    'picked/cave_mushroom_pink.png',
    'picked/cave_mushroom_brown.png',
    'picked/cave_mushroom_yellow.png',
  ],
  bush: [
    'picked/bush_green.png',
    'picked/bush_berry.png',
    'picked/bush_orange.png',
    'picked/bush_blue.png',
  ],
  grass: [
    'picked/grass_tuft_green.png',
    'picked/grass_tuft_orange.png',
    'picked/grass_tuft_purple.png',
  ],
  barn: ['buildings/barn/barn.png'],
  shed: ['buildings/shed/shed.png'],
  greenhouse: ['buildings/greenhouse/fixed.png', 'buildings/greenhouse/broken.png'],
  goldclock: ['buildings/gold_clock/gold_clock.png'],
  // 家具（旧几何画法已删，等 LoRA 再扩充）
  chair: ['picked/chair_wood.png'],
  table: ['picked/table_round.png'],
  bed: ['picked/bed_red.png'],
  bench: ['picked/bench_love.png'],
}

// ---------- 动物：类型 → 素材文件夹列表 ----------
export const ANIMALS = {
  cat: ['cat', 'cat1', 'cat2', 'cat3', 'cat4', 'cat5'],
  dog: ['dog', 'dog1', 'dog2', 'dog3', 'dog4', 'dog5'],
  rabbit: ['BabyRabbit'],
  dinosaur: ['Dinosaur'],
  chicken: ['BabyBlue_Chicken', 'BabyBrown_Chicken', 'BabyWhite_Chicken', 'BabyGolden_Chicken', 'BabyVoid_Chicken', 'Blue_Chicken', 'Brown_Chicken'],
  cow: ['Brown_Cow', 'BabyBrown_Cow', 'BabyWhite_Cow'],
  pig: ['BabyPig'],
  sheep: ['BabySheep'],
  goat: ['BabyGoat'],
  ostrich: ['BabyOstrich'],
}

// 动物动画：行 0 = 走路，4 帧
export const ANIMAL_FRAMES = 4

// ---------- 颜色词 → 变体下标（有对应素材的颜色才命中）----------
const COLOR_VARIANT = {
  tree: { green: 0, orange: 1, yellow: 3, pink: 4, purple: 5, red: 6, white: 11, blue: 14 },
  rock: { white: 3, red: 4, gold: 4 },
  bush: { green: 0, red: 1, orange: 2, blue: 3 },
  mushroom: { red: 0, white: 1, pink: 3, brown: 4, yellow: 5 },
  grass: { green: 0, orange: 1, purple: 2 },
  house: { blue: 6 },
}

// 动物颜色词 → 文件夹（没有的颜色就按词哈希到现有花色）
const ANIMAL_COLOR = {
  chicken: { blue: 'BabyBlue_Chicken', brown: 'BabyBrown_Chicken', white: 'BabyWhite_Chicken', gold: 'BabyGolden_Chicken', golden: 'BabyGolden_Chicken', black: 'BabyVoid_Chicken' },
  cow: { brown: 'Brown_Cow', white: 'BabyWhite_Cow' },
}

// 词 → 稳定哈希（把任意颜色词摊到现有花色上）
function hashWord(w) {
  let h = 0
  for (let i = 0; i < w.length; i++) h = (h * 31 + w.charCodeAt(i)) >>> 0
  return h
}

/**
 * 解析物体 → 贴图路径
 * @returns {{src: string, kind: 'static'|'animal'} | null}
 *   animal 的 src 每帧不同（由 time 驱动）；static 固定
 */
export function resolveSprite(ud, time) {
  const { type, colorWord = '' } = ud
  const folders = ANIMALS[type]
  if (folders) {
    let folder = null
    const colorMap = ANIMAL_COLOR[type]
    if (colorMap && colorMap[colorWord]) {
      folder = colorMap[colorWord]
    } else if (colorWord) {
      folder = folders[hashWord(colorWord) % folders.length]
    } else {
      const idx = (ud.variant || 0) % folders.length
      folder = folders[idx]
    }
    const frame = Math.floor((time || 0) / 200) % ANIMAL_FRAMES
    return { src: `${SPRITE_BASE}/animals/${folder}/r00_c0${frame}.png`, kind: 'animal' }
  }

  if (type === 'fish') {
    if (ud.fishIdx === undefined) ud.fishIdx = Math.floor(Math.random() * 182)
    return { src: `${SPRITE_BASE}/aquarium/fish_${String(ud.fishIdx).padStart(3, '0')}.png`, kind: 'static' }
  }

  const list = SPRITES[type]
  if (!list || list.length === 0) return null
  const colorMap = COLOR_VARIANT[type]
  let idx = ud.variant || 0
  if (colorMap && colorMap[colorWord] !== undefined) {
    idx = colorMap[colorWord] // 颜色词优先命中
  } else {
    idx = idx % list.length
  }
  ud.variant = idx
  return { src: `${SPRITE_BASE}/${list[idx]}`, kind: 'static' }
}

/** 某类型有多少变体（换装按钮用） */
export function variantCount(type) {
  if (ANIMALS[type]) return ANIMALS[type].length
  const list = SPRITES[type]
  return list ? list.length : 1
}

// ---------- 主角 Abigail ----------
export const PLAYER = {
  rows: { down: 'r00', right: 'r01', up: 'r02', left: 'r01' }, // 左 = 右镜像
  frames: 4,
  scale: 1.5, // 16x32 → 24x48
}

// ---------- 图片加载器（含占位/失败兜底） ----------
const cache = new Map() // src → HTMLImageElement | null(失败)

export function getSprite(src) {
  const hit = cache.get(src)
  if (hit === undefined) return null
  return hit
}

export function requestSprite(src) {
  if (cache.has(src)) return
  cache.set(src, null) // 先占位防重复请求
  const img = new Image()
  img.onload = () => cache.set(src, img)
  img.onerror = () => cache.set(src, null)
  img.src = src
}

/** 已加载且可绘制 */
export function spriteReady(src) {
  const img = cache.get(src)
  return !!img && img.complete && img.naturalWidth > 0
}
