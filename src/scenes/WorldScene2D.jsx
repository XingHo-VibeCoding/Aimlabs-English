import { useEffect, useRef } from 'react'
import { parseDescription, COLORS } from '../ai/dictionary.js'
import {
  resolveSprite,
  variantCount,
  getSprite,
  requestSprite,
  spriteReady,
  PLAYER,
} from '../sprites/spriteRegistry.js'

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

// 色值 → 颜色词（属性面板改色时反查，供贴图变体命中）
const HEX_TO_WORD = Object.fromEntries(
  Object.entries(COLORS).map(([w, hex]) => [hex, w])
)
function colorWordFromHex(hex) {
  return HEX_TO_WORD[hex] || ''
}

// 哪些物体会阻挡主角通行（碰撞体）；花/草/蘑菇/灌木等矮的不挡
const BLOCKING_TYPES = {
  tree: true, house: true, rock: true,
  tower: true, bridge: true, fence: true,
  boat: true, barn: true, shed: true, greenhouse: true, goldclock: true,
}

// 可互动物体（靠近按 E 触发）
const INTERACTABLE_TYPES = {
  flower: true, // 浇水开花
}

// 一天时长（毫秒），60 秒 = 一个昼夜循环
const DAY_LENGTH = 60000

// 物体贴图渲染：几何画法已全部退役（2026-10 素材大整合）
// 流程：resolveSprite 算出贴图路径 → 未加载先请求并画占位 → 加载完成画图
// 兜底：没有任何贴图（类型失效）画半透明方块，绝不空白、绝不白屏
function drawObject(ctx, obj, time) {
  const { scale = 1 } = obj.userData
  const x = obj.x * TILE
  const y = obj.y * TILE
  const res = resolveSprite(obj.userData, time)
  if (!res) {
    // 类型失效兜底：半透明提示块
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.fillRect(x + 8, y + 8, TILE - 16, TILE - 16)
    return
  }
  if (res.kind === 'animal') {
    // 动物：影子 + 4 帧走路动画，锚点=脚底中心
    ctx.fillStyle = 'rgba(0,0,0,0.2)'
    ctx.beginPath()
    ctx.ellipse(x + TILE / 2, y + TILE - 3, 10 * scale, 4 * scale, 0, 0, Math.PI * 2)
    ctx.fill()
    drawSprite(ctx, res.src, x + TILE / 2, y + TILE, scale)
    return
  }
  // 静态物体：影子 + 贴图，锚点=底部中心
  const img = getSprite(res.src)
  if (img) {
    const w = img.naturalWidth * scale
    const h = img.naturalHeight * scale
    ctx.fillStyle = 'rgba(0,0,0,0.2)'
    ctx.beginPath()
    ctx.ellipse(x + TILE / 2, y + TILE - 2, Math.min(w / 2, TILE * 0.9), 4 * scale, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  drawSprite(ctx, res.src, x + TILE / 2, y + TILE, scale)
}

// 画一张贴图（异步加载：没好就画占位小方块）
function drawSprite(ctx, src, anchorX, anchorBottomY, scale) {
  if (!spriteReady(src)) {
    requestSprite(src)
    // 占位：小色块，避免闪空白
    ctx.fillStyle = 'rgba(120,120,120,0.35)'
    ctx.fillRect(anchorX - 6, anchorBottomY - 12, 12, 12)
    return
  }
  const img = getSprite(src)
  const w = img.naturalWidth * scale
  const h = img.naturalHeight * scale
  ctx.drawImage(img, anchorX - w / 2, anchorBottomY - h, w, h)
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

// 主角：Abigail（16x32 贴图，下/右/上三朝向各 4 帧走路动画，左 = 右镜像）
function drawPlayer(ctx, p, time) {
  const x = p.x * TILE
  const y = p.y * TILE
  const moving = p.moving
  const frame = moving ? Math.floor(time / 150) % PLAYER.frames : 0
  const src = `/sprites/player/${PLAYER.rows[p.dir] || 'r00'}_c0${frame}.png`
  ctx.save()
  ctx.translate(x + TILE / 2, y + TILE)
  // 影子
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.beginPath()
  ctx.ellipse(0, -2, 9, 3.5, 0, 0, Math.PI * 2)
  ctx.fill()
  // 朝左 = 朝右镜像翻转（星露谷官方做法，省一套素材）
  if (p.dir === 'left') ctx.scale(-1, 1)
  if (!spriteReady(src)) {
    requestSprite(src)
    ctx.fillStyle = 'rgba(120,120,120,0.35)'
    ctx.fillRect(-8, -32, 16, 32)
    ctx.restore()
    return
  }
  const img = getSprite(src)
  const w = img.naturalWidth * PLAYER.scale
  const h = img.naturalHeight * PLAYER.scale
  ctx.drawImage(img, -w / 2, -h, w, h)
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
      selectedAt: 0, // 最近一次选中的时刻（毫秒），驱动「选中回弹」动画
      confirmAt: 0, // 最近一次变换落定的时刻（毫秒），驱动「确认闪」动画
      cam: { x: 0, y: 0 }, // 摄像机左上角（世界坐标，格）
      zoom: 1, // 缩放倍率
      hover: null, // 拖拽悬停时的落点预览（世界坐标，格）
      gameTime: DAY_LENGTH * 0.25, // 游戏时间，从早晨开始
      nearInteractable: null, // 当前靠近的可互动物体
    }
    stateRef.current = state

    // 预置几个物体（全部走贴图素材）
    const preset = [
      { type: 'tree', color: 0x4caf50, colorWord: '', scale: 1, variant: 0, x: 3, y: 4 },
      { type: 'tree', color: 0xff9800, colorWord: 'orange', scale: 1, variant: 1, x: 12, y: 3 },
      { type: 'house', color: 0xf3a63b, colorWord: '', scale: 1, variant: 0, x: 8, y: 8 },
      { type: 'chicken', color: 0xffd54f, colorWord: 'gold', scale: 1, variant: 0, x: 6, y: 6 },
      { type: 'flower', color: 0xf48fb1, colorWord: '', scale: 1, variant: 0, x: 7, y: 5 },
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
      if (hit) state.selectedAt = performance.now() // 选中瞬间，触发回弹
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
          state.selectedAt = performance.now()
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
          // 颜色值 → 颜色词（贴图渲染靠 colorWord 选素材变体）
          if (patch.color !== undefined) {
            patch = { ...patch, colorWord: colorWordFromHex(patch.color) }
          }
          Object.assign(state.selected.userData, patch)
          if (patch.scale !== undefined) state.selected.scale = patch.scale
          state.confirmAt = performance.now() // 变换落定，闪一次确认光
          if (sceneRef.current.onSelectChange) sceneRef.current.onSelectChange({ ...state.selected.userData })
          return state.selected.userData
        },
        nextVariant() {
          if (!state.selected) return null
          const ud = state.selected.userData
          const n = variantCount(ud.type)
          if (n > 1) {
            ud.variant = ((ud.variant || 0) + 1) % n
            ud.colorWord = '' // 手动换变体后，解除颜色词锁定
            state.confirmAt = performance.now() // 换变体落定，闪确认光
            if (sceneRef.current.onSelectChange) {
              sceneRef.current.onSelectChange({ ...ud })
            }
          }
          return { ...ud }
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
      if (obj.userData.type === 'flower') {
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
          // ===== 选中反馈（暖金描边 + 呼吸 + 回弹 + 确认闪）=====
          const selAge = time - state.selectedAt // 选中后经过的毫秒
          // 选中回弹：前 220ms 内先放大 8% 再弹回，之后恢复 1
          let selBounce = 1
          if (selAge < 220) {
            const t = selAge / 220 // 0~1
            selBounce = 1 + Math.sin(t * Math.PI) * 0.08
          }
          // 呼吸：描边明暗以 ~1.4s 周期缓慢起伏（幅度 30%）
          const breathe = 0.5 + 0.5 * Math.sin(time * 0.0045)
          const strokeAlpha = 0.55 + 0.3 * breathe
          // 确认闪：变换落定后 300ms 内描边变亮一次再回落
          const confAge = time - state.confirmAt
          let flash = 0
          if (confAge >= 0 && confAge < 300) {
            flash = Math.sin((1 - confAge / 300) * Math.PI) // 从亮到暗的半个正弦
          }

          const cx = obj.x * TILE + TILE / 2
          const cy = obj.y * TILE + TILE / 2
          const half = TILE / 2 * (obj.scale || 1) * selBounce
          // 选中阴影（暖金淡底，随回弹缩放）
          ctx.fillStyle = `rgba(255, 213, 79, ${0.18 + 0.08 * breathe})`
          ctx.fillRect(cx - half, cy - half, half * 2, half * 2)
          // 描边：暖金，呼吸 + 确认闪叠加
          ctx.strokeStyle = `rgba(255, 213, 79, ${Math.min(1, strokeAlpha + flash)})`
          ctx.lineWidth = 2 + flash * 2
          ctx.strokeRect(cx - half, cy - half, half * 2, half * 2)
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