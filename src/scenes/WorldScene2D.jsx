import { useEffect, useRef } from 'react'
import { parseDescription } from '../ai/dictionary.js'

/**
 * WorldScene2D：2.5D 像素游戏场景（纯 Canvas，零依赖）
 * 斜 45° 俯视固定视角，不旋转、不缩放。
 * 支持：主角移动、英文造物、点选编辑、拖拽放置。
 */

// 世界与视野尺寸
const TILE = 32
const MAP_W = 40 // 世界宽（格）
const MAP_H = 30 // 世界高（格）
const VIEW_W = 20 // 视野宽（格）
const VIEW_H = 15 // 视野高（格）
const CANVAS_W = VIEW_W * TILE
const CANVAS_H = VIEW_H * TILE

// 颜色表（数字 → CSS）
const COLOR_MAP = {
  0xff4d4d: '#ff4d4d', 0x4caf50: '#4caf50', 0x42a5f5: '#42a5f5',
  0xffd54f: '#ffd54f', 0xf48fb1: '#f48fb1', 0xab47bc: '#ab47bc',
  0xff9800: '#ff9800', 0xffffff: '#ffffff', 0x424242: '#424242',
  0x8d6e63: '#8d6e63', 0x9e9e9e: '#9e9e9e', 0x00695c: '#00695c',
  0x616161: '#616161', 0xb71c1c: '#b71c1c', 0x6d7f8c: '#6d7f8c',
  0x212121: '#212121', 0xf5f5dc: '#f5f5dc', 0x66bb6a: '#66bb6a',
  0xf3a63b: '#f3a63b',
}

function colorCss(n) {
  return COLOR_MAP[n] || '#' + (n || 0).toString(16).padStart(6, '0')
}

// 哪些物体会阻挡主角通行（碰撞体）；花/云/蘑菇等矮的不挡
const BLOCKING_TYPES = {
  tree: true, house: true, rock: true, mountain: true,
  castle: true, tower: true, bridge: true, fence: true,
  lamp: true, car: true, boat: true,
}

// 可互动物体（靠近按 E 触发）
const INTERACTABLE_TYPES = {
  lamp: true,   // 开关灯
  flower: true, // 浇水开花
}

// 一天时长（毫秒），60 秒 = 一个昼夜循环
const DAY_LENGTH = 60000

// 每种物体的像素占位画法（色块拼出轮廓，后面可换成真像素图）
function drawObject(ctx, obj, time) {
  const { type, color, scale, variant } = obj.userData
  const s = (obj.scale || 1) * TILE * 0.8
  const x = obj.x * TILE
  const y = obj.y * TILE
  const c = colorCss(color)
  const bob = obj.userData.type === 'cloud' ? Math.sin(time * 0.002 + x) * 2 : 0
  ctx.save()
  ctx.translate(x + TILE / 2, y + TILE + bob)
  ctx.scale(scale, scale)

  switch (type) {
    case 'tree': {
      if (variant === 1) { // 松树
        ctx.fillStyle = '#8d6e63'; ctx.fillRect(-3, -12, 6, 12)
        ctx.fillStyle = c
        ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(-10, -10); ctx.lineTo(10, -10); ctx.closePath(); ctx.fill()
        ctx.beginPath(); ctx.moveTo(0, -34); ctx.lineTo(-7, -20); ctx.lineTo(7, -20); ctx.closePath(); ctx.fill()
      } else if (variant === 2) { // 塔形
        ctx.fillStyle = '#8d6e63'; ctx.fillRect(-2, -14, 4, 14)
        ctx.fillStyle = c
        ctx.fillRect(-8, -20, 16, 6)
        ctx.fillRect(-6, -28, 12, 8)
        ctx.fillRect(-4, -36, 8, 8)
      } else { // 圆冠
        ctx.fillStyle = '#8d6e63'; ctx.fillRect(-3, -10, 6, 10)
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, -16, 11, 0, Math.PI * 2); ctx.fill()
      }
      break
    }
    case 'house': {
      if (variant === 1) { // 平顶+烟囱
        ctx.fillStyle = c; ctx.fillRect(-14, -20, 28, 20)
        ctx.fillStyle = '#616161'; ctx.fillRect(-15, -24, 30, 4)
        ctx.fillStyle = '#b71c1c'; ctx.fillRect(6, -32, 6, 10)
      } else { // 尖顶
        ctx.fillStyle = c; ctx.fillRect(-12, -18, 24, 18)
        ctx.fillStyle = '#b71c1c'
        ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(-14, -18); ctx.lineTo(14, -18); ctx.closePath(); ctx.fill()
      }
      break
    }
    case 'rock': {
      if (variant === 1) { // 尖石
        ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(-8, 0); ctx.lineTo(8, 0); ctx.closePath(); ctx.fill()
      } else { // 圆石
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, -8, 9, 0, Math.PI * 2); ctx.fill()
      }
      break
    }
    case 'mountain': {
      if (variant === 1) { // 土山
        ctx.fillStyle = '#8d6e63'; ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(-14, 0); ctx.lineTo(14, 0); ctx.closePath(); ctx.fill()
      } else { // 雪山
        ctx.fillStyle = '#6d7f8c'; ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(-12, 0); ctx.lineTo(12, 0); ctx.closePath(); ctx.fill()
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(-5, -14); ctx.lineTo(5, -14); ctx.closePath(); ctx.fill()
      }
      break
    }
    case 'castle': {
      ctx.fillStyle = '#9e9e9e'; ctx.fillRect(-12, -14, 24, 14)
      ctx.fillStyle = c; ctx.fillRect(-8, -24, 16, 10)
      ctx.fillStyle = '#b71c1c'; ctx.beginPath(); ctx.moveTo(0, -34); ctx.lineTo(-10, -24); ctx.lineTo(10, -24); ctx.closePath(); ctx.fill()
      break
    }
    case 'tower': {
      ctx.fillStyle = c; ctx.fillRect(-6, -28, 12, 28)
      ctx.fillStyle = '#b71c1c'; ctx.beginPath(); ctx.moveTo(0, -38); ctx.lineTo(-8, -28); ctx.lineTo(8, -28); ctx.closePath(); ctx.fill()
      break
    }
    case 'bridge': {
      ctx.fillStyle = '#8d6e63'; ctx.fillRect(-18, -6, 36, 6)
      ctx.fillStyle = c; ctx.fillRect(-18, -12, 36, 4)
      break
    }
    case 'flower': {
      ctx.fillStyle = '#4caf50'; ctx.fillRect(-2, -12, 4, 12)
      const bloomed = obj.userData.bloomed
      const fc = bloomed ? '#ff7043' : c // 开花后更鲜艳
      ctx.fillStyle = fc
      const pr = bloomed ? 8 : 6
      ctx.beginPath(); ctx.arc(0, -14, pr, 0, Math.PI * 2); ctx.fill()
      if (bloomed) {
        ctx.fillStyle = '#fff59d'
        ctx.beginPath(); ctx.arc(0, -14, 3, 0, Math.PI * 2); ctx.fill()
      }
      break
    }
    case 'cloud': {
      ctx.fillStyle = '#fff'
      ctx.beginPath(); ctx.arc(-7, -8, 6, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(0, -12, 7, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(7, -8, 6, 0, Math.PI * 2); ctx.fill()
      break
    }
    case 'car': {
      ctx.fillStyle = c; ctx.fillRect(-14, -12, 28, 12)
      ctx.fillStyle = '#42a5f5'; ctx.fillRect(-6, -18, 12, 6)
      ctx.fillStyle = '#212121'
      ctx.beginPath(); ctx.arc(-8, 0, 4, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(8, 0, 4, 0, Math.PI * 2); ctx.fill()
      break
    }
    case 'boat': {
      ctx.fillStyle = c; ctx.fillRect(-14, -8, 28, 8)
      ctx.fillStyle = '#8d6e63'; ctx.fillRect(-2, -22, 4, 14)
      break
    }
    case 'mushroom': {
      ctx.fillStyle = '#f5f5dc'; ctx.fillRect(-4, -10, 8, 10)
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, -12, 10, Math.PI, 0); ctx.fill()
      break
    }
    case 'fence': {
      ctx.fillStyle = '#8d6e63'
      ctx.fillRect(-16, -14, 4, 14); ctx.fillRect(-2, -14, 4, 14); ctx.fillRect(12, -14, 4, 14)
      ctx.fillRect(-16, -12, 32, 3); ctx.fillRect(-16, -6, 32, 3)
      break
    }
    case 'lamp': {
      ctx.fillStyle = '#424242'; ctx.fillRect(-3, -24, 6, 24)
      const lit = obj.userData.on
      if (lit) {
        // 光晕
        const glow = ctx.createRadialGradient(0, -28, 2, 0, -28, 16)
        glow.addColorStop(0, 'rgba(255,213,79,0.9)')
        glow.addColorStop(1, 'rgba(255,213,79,0)')
        ctx.fillStyle = glow
        ctx.beginPath(); ctx.arc(0, -28, 16, 0, Math.PI * 2); ctx.fill()
      }
      ctx.fillStyle = lit ? '#ffe082' : '#9e9e9e'
      ctx.beginPath(); ctx.arc(0, -28, 6, 0, Math.PI * 2); ctx.fill()
      break
    }
    case 'cat':
    case 'dog': {
      ctx.fillStyle = c; ctx.fillRect(-10, -12, 20, 12)
      ctx.beginPath(); ctx.arc(0, -16, 7, 0, Math.PI * 2); ctx.fill()
      if (type === 'cat') {
        ctx.beginPath(); ctx.moveTo(-6, -20); ctx.lineTo(-4, -26); ctx.lineTo(-1, -20); ctx.closePath(); ctx.fill()
        ctx.beginPath(); ctx.moveTo(1, -20); ctx.lineTo(4, -26); ctx.lineTo(6, -20); ctx.closePath(); ctx.fill()
      } else {
        ctx.fillRect(-7, -22, 3, 8); ctx.fillRect(4, -22, 3, 8)
      }
      break
    }
    default: {
      ctx.fillStyle = c; ctx.fillRect(-8, -16, 16, 16)
    }
  }
  ctx.restore()
}

// 昼夜色调：按游戏时间算出一个遮罩色（早晨→白天→黄昏→夜晚→循环）
function applyDayNight(ctx, gameTime) {
  const t = gameTime / DAY_LENGTH // 0~1
  // 用分段定义一天：0~0.25 早晨淡金，0.25~0.6 白天无遮罩，0.6~0.8 黄昏橙，0.8~1 夜晚蓝
  let r = 0, g = 0, b = 0, a = 0
  if (t < 0.25) {
    // 早晨：淡淡暖色
    a = 0.12
    r = 255; g = 220; b = 160
  } else if (t < 0.6) {
    a = 0 // 白天
  } else if (t < 0.8) {
    // 黄昏：橙
    const k = (t - 0.6) / 0.2
    a = 0.3 * k
    r = 255; g = 140; b = 60
  } else {
    // 夜晚：蓝紫，越来越深
    const k = (t - 0.8) / 0.2
    a = 0.45 * k
    r = 30; g = 30; b = 80
  }
  if (a > 0) {
    ctx.fillStyle = `rgba(${r},${g},${b},${a})`
    ctx.fillRect(0, 0, MAP_W * TILE, MAP_H * TILE)
  }
}

// 主角（GOD）：像素小人，2 帧走路动画
function drawPlayer(ctx, p, time) {
  const x = p.x * TILE
  const y = p.y * TILE
  const moving = p.moving
  const frame = moving ? Math.floor(time / 150) % 2 : 0
  const legOffset = frame === 0 ? 2 : -2
  ctx.save()
  ctx.translate(x + TILE / 2, y + TILE)
  // 影子
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.beginPath(); ctx.ellipse(0, 0, 8, 3, 0, 0, Math.PI * 2); ctx.fill()
  // 腿
  ctx.fillStyle = '#37474f'
  ctx.fillRect(-4, -6 + (moving ? legOffset : 0), 3, 6)
  ctx.fillRect(1, -6 - (moving ? legOffset : 0), 3, 6)
  // 身体（披风色）
  ctx.fillStyle = '#5e35b1'
  ctx.fillRect(-6, -16, 12, 12)
  // 头
  ctx.fillStyle = '#ffcc80'
  ctx.beginPath(); ctx.arc(0, -20, 6, 0, Math.PI * 2); ctx.fill()
  // 眼睛（朝向）
  ctx.fillStyle = '#212121'
  if (p.dir === 'left') { ctx.fillRect(-4, -21, 2, 2) }
  else if (p.dir === 'right') { ctx.fillRect(2, -21, 2, 2) }
  else { ctx.fillRect(-3, -21, 2, 2); ctx.fillRect(1, -21, 2, 2) }
  // 王冠（GOD 标识）
  ctx.fillStyle = '#ffd54f'
  ctx.fillRect(-4, -28, 8, 3)
  ctx.fillRect(-4, -31, 2, 3); ctx.fillRect(0, -32, 2, 4); ctx.fillRect(4, -31, 2, 3)
  ctx.restore()
}

export default function WorldScene2D({ sceneRef, fontScale = 1 }) {
  const canvasRef = useRef(null)
  const stateRef = useRef(null)
  const fontScaleRef = useRef(fontScale)
  fontScaleRef.current = fontScale

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = CANVAS_W
    canvas.height = CANVAS_H

    // 世界状态
    const state = {
      player: { x: 10, y: 10, dir: 'down', moving: false },
      objects: [],
      keys: {},
      selected: null,
      cam: { x: 0, y: 0 }, // 摄像机左上角（世界坐标，格）
      zoom: 1, // 缩放倍率
      hover: null, // 拖拽悬停时的落点预览（世界坐标，格）
      gameTime: DAY_LENGTH * 0.25, // 游戏时间，从早晨开始
      nearInteractable: null, // 当前靠近的可互动物体
    }
    stateRef.current = state

    // 预置几个物体（替代旧 3D 的树/房子）
    const preset = [
      { type: 'tree', color: 0x4caf50, scale: 0.8, variant: 0, x: 3, y: 4 },
      { type: 'tree', color: 0x66bb6a, scale: 1.2, variant: 0, x: 12, y: 3 },
      { type: 'house', color: 0xf3a63b, scale: 1, variant: 0, x: 8, y: 8 },
      { type: 'lamp', color: 0x424242, scale: 1, variant: 0, x: 7, y: 5, on: true },
    ]
    preset.forEach((o) => state.objects.push({ userData: o, x: o.x, y: o.y, scale: o.scale }))

    // 键盘控制：排除输入框聚焦时的按键，避免打字时小人乱动
    function onKeyDown(e) {
      // 如果焦点在输入框/文本域/按钮里，不响应移动键
      const tag = e.target.tagName.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'button') return
      const k = e.key.toLowerCase()
      state.keys[k] = true
      if (k === 'delete' || k === 'backspace') {
        if (state.selected && sceneRef.current) sceneRef.current.deleteSelected()
      }
      // 按 E 触发互动（M12）
      if (k === 'e' && state.nearInteractable) {
        toggleInteractable(state.nearInteractable)
      }
    }
    function onKeyUp(e) {
      state.keys[e.key.toLowerCase()] = false
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    // 点击选中：把屏幕坐标换算成世界坐标（考虑摄像机和缩放）
    function onClick(e) {
      const rect = canvas.getBoundingClientRect()
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top
      const wx = state.cam.x + sx / (TILE * state.zoom)
      const wy = state.cam.y + sy / (TILE * state.zoom)
      let hit = null
      for (const obj of state.objects) {
        const dx = Math.abs(obj.x + 0.5 - wx)
        const dy = Math.abs(obj.y + 0.5 - wy)
        const r = 0.6 * (obj.scale || 1)
        if (dx < r && dy < r) { hit = obj; break }
      }
      state.selected = hit
      if (sceneRef.current && sceneRef.current.onSelectChange) {
        sceneRef.current.onSelectChange(hit ? { ...hit.userData } : null)
      }
    }
    canvas.addEventListener('click', onClick)

    // 滚轮缩放（以鼠标位置为中心）
    function onWheel(e) {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top
      const wx = state.cam.x + sx / (TILE * state.zoom)
      const wy = state.cam.y + sy / (TILE * state.zoom)
      const oldZoom = state.zoom
      state.zoom = Math.max(0.5, Math.min(3, state.zoom * (e.deltaY < 0 ? 1.1 : 0.9)))
      // 保持鼠标下的世界点不动
      state.cam.x = wx - sx / (TILE * state.zoom)
      state.cam.y = wy - sy / (TILE * state.zoom)
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })

    // 暴露给外部的方法
    if (sceneRef) {
      sceneRef.current = {
        onSelectChange: null,
        spawn(params, pos) {
          // 落点吸附到网格中心（M10 网格吸附）
          const gx = pos ? Math.round(pos.x - 0.5) + 0.5 : 5.5
          const gy = pos ? Math.round(pos.y - 0.5) + 0.5 : 5.5
          const obj = {
            userData: { ...params },
            x: Math.max(0.5, Math.min(MAP_W - 0.5, gx)),
            y: Math.max(0.5, Math.min(MAP_H - 0.5, gy)),
            scale: params.scale || 1,
          }
          state.objects.push(obj)
          // 放置后自动选中，方便立即编辑
          state.selected = obj
          if (sceneRef.current.onSelectChange) {
            sceneRef.current.onSelectChange({ ...obj.userData })
          }
          return obj
        },
        screenToWorld(clientX, clientY) {
          const rect = canvas.getBoundingClientRect()
          const sx = clientX - rect.left
          const sy = clientY - rect.top
          return {
            x: state.cam.x + sx / (TILE * state.zoom),
            y: state.cam.y + sy / (TILE * state.zoom),
          }
        },
        // 拖拽悬停时更新落点预览
        setHoverPoint(clientX, clientY, active) {
          if (!active) {
            state.hover = null
            return
          }
          const rect = canvas.getBoundingClientRect()
          const sx = clientX - rect.left
          const sy = clientY - rect.top
          const wx = state.cam.x + sx / (TILE * state.zoom)
          const wy = state.cam.y + sy / (TILE * state.zoom)
          state.hover = {
            x: Math.max(0.5, Math.min(MAP_W - 0.5, Math.round(wx - 0.5) + 0.5)),
            y: Math.max(0.5, Math.min(MAP_H - 0.5, Math.round(wy - 0.5) + 0.5)),
          }
        },
        deleteSelected() {
          if (!state.selected) return false
          const i = state.objects.indexOf(state.selected)
          if (i >= 0) state.objects.splice(i, 1)
          state.selected = null
          if (sceneRef.current.onSelectChange) sceneRef.current.onSelectChange(null)
          return true
        },
        updateSelected(patch) {
          if (!state.selected) return null
          Object.assign(state.selected.userData, patch)
          if (patch.scale !== undefined) state.selected.scale = patch.scale
          if (sceneRef.current.onSelectChange) sceneRef.current.onSelectChange({ ...state.selected.userData })
          return state.selected.userData
        },
        nextVariant() {
          if (!state.selected) return null
          const counts = { tree: 3, house: 2, rock: 2, mountain: 2 }
          const type = state.selected.userData.type
          const n = counts[type] || 1
          if (n > 1) {
            state.selected.userData.variant = ((state.selected.userData.variant || 0) + 1) % n
            if (sceneRef.current.onSelectChange) sceneRef.current.onSelectChange({ ...state.selected.userData })
          }
          return state.selected.userData
        },
        // 返回场景里所有物体的快照（供保存用）
        getObjects() {
          return state.objects.map((o) => ({
            userData: { ...o.userData },
            x: o.x,
            y: o.y,
            scale: o.scale,
          }))
        },
      }
    }

    // 切换可互动物体的状态（M12）
    function toggleInteractable(obj) {
      if (!obj) return
      if (obj.userData.type === 'lamp') {
        obj.userData.on = !obj.userData.on
      } else if (obj.userData.type === 'flower') {
        obj.userData.bloomed = true // 浇水后开花
      }
    }

    // 碰撞判定：玩家（半径约 0.3 格）是否与某个阻挡物体重叠
    function isBlocked(px, py) {
      const playerR = 0.3
      for (const obj of state.objects) {
        if (!BLOCKING_TYPES[obj.userData.type]) continue
        const r = 0.35 * (obj.scale || 1) // 物体阻挡半径
        const dx = obj.x - px
        const dy = obj.y - py
        if (dx * dx + dy * dy < (r + playerR) * (r + playerR)) {
          return true
        }
      }
      return false
    }

    // 主循环
    let raf
    let lastTime = 0
    function loop(time) {
      raf = requestAnimationFrame(loop)
      // 推进游戏时间（昼夜循环，M11）
      if (lastTime === 0) lastTime = time
      state.gameTime = (state.gameTime + (time - lastTime)) % DAY_LENGTH
      lastTime = time

      // 更新主角
      const p = state.player
      const speed = 0.08
      let dx = 0, dy = 0
      if (state.keys['w'] || state.keys['arrowup']) dy -= speed
      if (state.keys['s'] || state.keys['arrowdown']) dy += speed
      if (state.keys['a'] || state.keys['arrowleft']) dx -= speed
      if (state.keys['d'] || state.keys['arrowright']) dx += speed
      p.moving = dx !== 0 || dy !== 0
      if (dx < 0) p.dir = 'left'
      else if (dx > 0) p.dir = 'right'
      else if (dy !== 0) p.dir = dy < 0 ? 'up' : 'down'

      // 碰撞检测：分轴移动，先试 X 再试 Y，避免贴墙滑动
      const nx = p.x + dx
      if (!isBlocked(nx, p.y)) {
        p.x = Math.max(0, Math.min(MAP_W - 1, nx))
      }
      const ny = p.y + dy
      if (!isBlocked(p.x, ny)) {
        p.y = Math.max(0, Math.min(MAP_H - 1, ny))
      }

      // 检测靠近的可互动物体（M12）
      state.nearInteractable = null
      for (const obj of state.objects) {
        if (!INTERACTABLE_TYPES[obj.userData.type]) continue
        const ddx = obj.x - p.x
        const ddy = obj.y - p.y
        if (ddx * ddx + ddy * ddy < 1.8 * 1.8) {
          state.nearInteractable = obj
          break
        }
      }

      // 摄像机跟随主角（平滑）
      const targetCamX = p.x - VIEW_W / 2
      const targetCamY = p.y - VIEW_H / 2
      state.cam.x += (targetCamX - state.cam.x) * 0.1
      state.cam.y += (targetCamY - state.cam.y) * 0.1
      // 限制摄像机不超出世界
      state.cam.x = Math.max(0, Math.min(MAP_W - VIEW_W, state.cam.x))
      state.cam.y = Math.max(0, Math.min(MAP_H - VIEW_H, state.cam.y))

      // 渲染：应用摄像机和缩放变换
      ctx.save()
      ctx.scale(state.zoom, state.zoom)
      ctx.translate(-state.cam.x * TILE, -state.cam.y * TILE)

      // 地面（整个世界）
      ctx.fillStyle = '#6ab04c'
      ctx.fillRect(0, 0, MAP_W * TILE, MAP_H * TILE)
      // 网格
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'
      ctx.lineWidth = 1
      for (let i = 0; i <= MAP_W; i++) {
        ctx.beginPath(); ctx.moveTo(i * TILE, 0); ctx.lineTo(i * TILE, MAP_H * TILE); ctx.stroke()
      }
      for (let i = 0; i <= MAP_H; i++) {
        ctx.beginPath(); ctx.moveTo(0, i * TILE); ctx.lineTo(MAP_W * TILE, i * TILE); ctx.stroke()
      }
      // 按 y 排序画物体（遮挡）
      const sorted = [...state.objects].sort((a, b) => a.y - b.y)
      for (const obj of sorted) {
        if (obj === state.selected) {
          ctx.fillStyle = 'rgba(37,99,235,0.3)'
          ctx.fillRect(obj.x * TILE - 2, obj.y * TILE - 2, TILE + 4, TILE + 4)
        }
        drawObject(ctx, obj, time)
      }
      // 昼夜色调遮罩（M11）：按游戏时间叠加一层半透明色
      applyDayNight(ctx, state.gameTime)
      // 拖拽悬停落点预览（半透明高亮格）
      if (state.hover) {
        const hx = (state.hover.x - 0.5) * TILE
        const hy = (state.hover.y - 0.5) * TILE
        ctx.fillStyle = 'rgba(37, 99, 235, 0.35)'
        ctx.fillRect(hx, hy, TILE, TILE)
        ctx.strokeStyle = 'rgba(37, 99, 235, 0.9)'
        ctx.lineWidth = 2
        ctx.strokeRect(hx, hy, TILE, TILE)
      }
      drawPlayer(ctx, p, time)
      // 靠近可互动物体时显示 E 提示（M12）
      if (state.nearInteractable) {
        const it = state.nearInteractable
        const ix = it.x * TILE
        const iy = it.y * TILE - 34
        const fs = fontScaleRef.current // 随全局字号缩放
        const bubbleR = 11 * fs
        const bubbleY = iy + 6 * fs
        ctx.fillStyle = 'rgba(0,0,0,0.65)'
        ctx.beginPath()
        ctx.arc(ix + TILE / 2, bubbleY, bubbleR, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.font = `bold ${Math.round(14 * fs)}px system-ui, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('E', ix + TILE / 2, bubbleY)
      }
      ctx.restore()
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      canvas.removeEventListener('click', onClick)
      canvas.removeEventListener('wheel', onWheel)
    }
  }, [sceneRef])

  return <canvas ref={canvasRef} className="world-canvas" />
}