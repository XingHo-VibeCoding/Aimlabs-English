import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'

/**
 * WorldScene：3D 场景骨架（P0-1）+ 词典生成闭环（P0-4 基础模式）
 * 地面 + 网格 + 天空背景 + 基础光照 + 鼠标旋转/缩放视角
 * 通过 ref 暴露 spawn(参数) 方法，让外部输入框能往场景里加物体。
 */
export default function WorldScene({ sceneRef }) {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    // 1. 场景：所有 3D 物体的容器
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x87ceeb) // 天蓝色天空

    // 2. 相机：你的"眼睛"，透视相机
    const camera = new THREE.PerspectiveCamera(
      60,
      mount.clientWidth / mount.clientHeight,
      0.1,
      1000
    )
    camera.position.set(8, 8, 12)
    camera.lookAt(0, 0, 0)

    // 3. 渲染器：把场景画到屏幕上（WebGL，兼容集显）
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mount.appendChild(renderer.domElement)

    // 4. 光照
    const ambient = new THREE.AmbientLight(0xffffff, 0.7)
    scene.add(ambient)
    const sun = new THREE.DirectionalLight(0xffffff, 1.2)
    sun.position.set(10, 20, 8)
    scene.add(sun)

    // 5. 地面：一块绿色平面
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.MeshStandardMaterial({ color: 0x6ab04c })
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.y = 0
    scene.add(ground)

    // 6. 地面网格：让人一眼看出"地面在哪"（AC-7）
    const grid = new THREE.GridHelper(30, 30, 0xffffff, 0x9aa5b1)
    grid.position.y = 0.01
    scene.add(grid)

    // 6.1 地面：用于射线检测（拖拽放置时定位落点）
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()

    // 7. 几个预制几何体占位（树 / 房子）
    const presetTree1 = makeTree(0x4caf50, 0.8, -3, 0, 1)
    const presetTree2 = makeTree(0x66bb6a, 1.2, 3, 0, -2)
    const presetHouse = makeHouse(0xf3a63b, 2, 0, 3)
    presetTree1.userData = { type: 'tree', color: 0x4caf50, scale: 0.8, variant: 0 }
    presetTree2.userData = { type: 'tree', color: 0x66bb6a, scale: 1.2, variant: 0 }
    presetHouse.userData = { type: 'house', color: 0xf3a63b, scale: 2, variant: 0 }
    scene.add(presetTree1, presetTree2, presetHouse)

    // 7.1 向外部暴露方法
    let spawnCount = 0
    // 场景里所有"可编辑物体"的集合（用于点选与删除）
    const editables = [presetTree1, presetTree2, presetHouse]
    // 当前选中的物体
    let selected = null

    // 选中态的高亮描边
    function highlight(obj) {
      obj.traverse((child) => {
        if (child.isMesh && child.material) {
          if (child.material.emissive) {
            child.material.emissive.setHex(0x2563eb)
            child.material.emissiveIntensity = 0.35
          }
        }
      })
    }
    function unhighlight(obj) {
      obj.traverse((child) => {
        if (child.isMesh && child.material) {
          if (child.material.emissive) {
            child.material.emissive.setHex(0x000000)
            child.material.emissiveIntensity = 1
          }
        }
      })
    }

    // TransformControls：移动/旋转/缩放三合一（Roblox 式 gizmo）
    const transform = new TransformControls(camera, renderer.domElement)
    transform.setSize(0.9)
    scene.add(transform)
    transform.addEventListener('dragging-changed', (event) => {
      // 拖动 gizmo 时禁用相机旋转，避免打架
      controls.enabled = !event.value
    })

    if (sceneRef) {
      sceneRef.current = {
        // 往场景里生成物体，可指定落点；返回物体以便外部选中
        spawn(params, pos) {
          const mesh = makeByType(params)
          mesh.userData = {
            type: params.type,
            color: params.color,
            scale: params.scale,
            variant: params.variant || 0,
          }
          if (pos) {
            mesh.position.copy(pos)
          } else {
            spawnCount += 1
            mesh.position.x += (spawnCount % 5) * 2.2 - 4
            mesh.position.z += Math.floor(spawnCount / 5) * 2.2 - 2
          }
          scene.add(mesh)
          editables.push(mesh)
          return mesh
        },
        // 把屏幕坐标(clientX/clientY)换算成地面上的落点
        groundPointAt(clientX, clientY) {
          const rect = renderer.domElement.getBoundingClientRect()
          pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1
          pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1
          raycaster.setFromCamera(pointer, camera)
          const hit = new THREE.Vector3()
          if (raycaster.ray.intersectPlane(groundPlane, hit)) return hit
          return null
        },
        // 切换变换模式：'translate' | 'rotate' | 'scale'
        setMode(mode) {
          transform.setMode(mode)
        },
        // 删除当前选中的物体
        deleteSelected() {
          if (!selected) return false
          const idx = editables.indexOf(selected)
          if (idx >= 0) editables.splice(idx, 1)
          transform.detach()
          scene.remove(selected)
          selected = null
          return true
        },
        // 获取当前选中物体的信息（属性面板用）
        getSelectedInfo() {
          if (!selected) return null
          const { type, color, scale } = selected.userData
          return { type, color, scale, variant: selected.userData.variant || 0, object: selected }
        },
        // 更新选中物体：改颜色 / 改大小 / 切样式（用新参数重建，保持原位置）
        updateSelected(patch) {
          if (!selected) return null
          const old = selected.userData
          const next = {
            type: patch.type ?? old.type,
            color: patch.color ?? old.color,
            scale: patch.scale ?? old.scale,
            variant: patch.variant ?? old.variant ?? 0,
          }
          const newObj = makeByType(next)
          // 保留原来的位置和旋转
          newObj.position.copy(selected.position)
          newObj.rotation.copy(selected.rotation)
          newObj.userData = next

          const idx = editables.indexOf(selected)
          if (idx >= 0) editables.splice(idx, 1, newObj)
          transform.detach()
          scene.remove(selected)
          scene.add(newObj)
          selected = newObj
          highlight(selected)
          transform.attach(selected)
          return next
        },
        // 切换到下一个样式（variant 循环），返回新 info
        nextVariant() {
          if (!selected) return null
          const old = selected.userData
          const count = variantCount(old.type)
          const nextVariant = count > 1 ? ((old.variant || 0) + 1) % count : old.variant || 0
          return this.updateSelected({ variant: nextVariant })
        },
        // 让外部知道"选中变了"（属性面板跟随）
        onSelectChange: null,
      }
    }

    // 选中变化时通知外部（App 用 onSelectChange 刷新属性面板）
    function notifySelect() {
      if (sceneRef.current && sceneRef.current.onSelectChange) {
        const info = selected ? selected.userData : null
        sceneRef.current.onSelectChange(
          info
            ? { type: info.type, color: info.color, scale: info.scale, variant: info.variant || 0 }
            : null
        )
      }
    }

    // 改造 select：选中变化时通知外部
    function select(obj) {
      if (selected === obj) return
      if (selected) {
        unhighlight(selected)
        transform.detach()
      }
      selected = obj
      if (obj) {
        highlight(obj)
        transform.attach(obj)
      }
      notifySelect()
    }

    // 点选：点击空白处取消选中，点击物体选中它
    function onClick(event) {
      // 如果正在拖拽 gizmo，不处理点击
      if (transform.dragging) return
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      const hits = raycaster.intersectObjects(editables, true)
      if (hits.length > 0) {
        // 命中的是某个可编辑物体（往上找它的根 group）
        let root = hits[0].object
        while (root.parent && root.parent !== scene && editables.indexOf(root) < 0) {
          root = root.parent
        }
        if (editables.indexOf(root) >= 0) {
          select(root)
        }
      } else {
        select(null)
      }
    }
    renderer.domElement.addEventListener('click', onClick)

    // Delete 键删除选中物体（AC-18）
    function onKeyDown(event) {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selected) {
          sceneRef.current?.deleteSelected()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)

    // 8. 视角控制：鼠标左键拖动旋转、滚轮缩放（AC-8）
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.maxPolarAngle = Math.PI / 2 - 0.05 // 不让视角穿到地面以下（AC-9）
    controls.minDistance = 3
    controls.maxDistance = 40
    controls.target.set(0, 0.5, 0)

    // 9. 渲染循环：每帧重画一次，形成动画
    let raf
    function animate() {
      raf = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // 10. 窗口大小变化时自适应
    function onResize() {
      camera.aspect = mount.clientWidth / mount.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mount.clientWidth, mount.clientHeight)
    }
    window.addEventListener('resize', onResize)

    // 清理：组件卸载时释放资源，避免内存泄漏
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('keydown', onKeyDown)
      renderer.domElement.removeEventListener('click', onClick)
      transform.dispose()
      controls.dispose()
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
}

/** 造一棵"树"：圆柱树干 + 球体树冠 */
function makeTree(color, scale, x, y, z) {
  const group = new THREE.Group()

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.2, 1, 12),
    new THREE.MeshStandardMaterial({ color: 0x8d6e63 })
  )
  trunk.position.y = 0.5
  group.add(trunk)

  const crown = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 20, 20),
    new THREE.MeshStandardMaterial({ color })
  )
  crown.position.y = 1.3
  group.add(crown)

  group.position.set(x, y, z)
  group.scale.setScalar(scale)
  return group
}

/** 松树（tree variant 1）：圆锥层层叠的圣诞树造型 */
function makePineTree(color, scale, x, y, z) {
  const group = new THREE.Group()
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.18, 0.6, 12),
    new THREE.MeshStandardMaterial({ color: 0x8d6e63 })
  )
  trunk.position.y = 0.3
  group.add(trunk)
  const tiers = [0.55, 1.0, 1.45]
  tiers.forEach((ty, i) => {
    const r = 0.9 - i * 0.2
    const tier = new THREE.Mesh(
      new THREE.ConeGeometry(r, 0.7, 12),
      new THREE.MeshStandardMaterial({ color })
    )
    tier.position.y = ty
    group.add(tier)
  })
  group.position.set(x, y, z)
  group.scale.setScalar(scale)
  return group
}

/** 塔形树（tree variant 2）：细高的多层圆冠树 */
function makeTowerTree(color, scale, x, y, z) {
  const group = new THREE.Group()
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.16, 1.8, 12),
    new THREE.MeshStandardMaterial({ color: 0x8d6e63 })
  )
  trunk.position.y = 0.9
  group.add(trunk)
  const balls = [0.35, 0.5, 0.65]
  balls.forEach((r, i) => {
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(r, 16, 16),
      new THREE.MeshStandardMaterial({ color })
    )
    ball.position.y = 1.1 + i * 0.55
    group.add(ball)
  })
  group.position.set(x, y, z)
  group.scale.setScalar(scale)
  return group
}

/** 造一座"房子"：长方体主体 + 三角屋顶 */
function makeHouse(color, scale, x, y, z) {
  const group = new THREE.Group()

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 1.2, 1.2),
    new THREE.MeshStandardMaterial({ color })
  )
  body.position.y = 0.6
  group.add(body)

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(1.2, 0.8, 4),
    new THREE.MeshStandardMaterial({ color: 0xb71c1c })
  )
  roof.position.y = 1.6
  roof.rotation.y = Math.PI / 4
  group.add(roof)

  group.position.set(x, y, z)
  group.scale.setScalar(scale)
  return group
}

/** 平顶房（house variant 1）：加烟囱的现代平顶造型 */
function makeFlatHouse(color, scale, x, y, z) {
  const group = new THREE.Group()
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 1.5, 1.3),
    new THREE.MeshStandardMaterial({ color })
  )
  body.position.y = 0.75
  group.add(body)
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 0.2, 1.5),
    new THREE.MeshStandardMaterial({ color: 0x616161 })
  )
  roof.position.y = 1.6
  group.add(roof)
  const chimney = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.8, 0.3),
    new THREE.MeshStandardMaterial({ color: 0xb71c1c })
  )
  chimney.position.set(0.5, 2.0, 0)
  group.add(chimney)
  group.position.set(x, y, z)
  group.scale.setScalar(scale)
  return group
}

/**
 * 素材注册表：新增一种可生成的物体，只需在这里加一行。
 * 键 = 词典里的类型名；值 = 造物函数或"变体数组"。
 * 有多个造型的类型用数组（如 tree 有 3 种树），"换样式"会在数组里循环切换。
 */
const BUILDERS = {
  tree: [makeTree, makePineTree, makeTowerTree],
  house: [makeHouse, makeFlatHouse],
  rock: [makeRock, makeSharpRock],
  mountain: [makeMountain, makeDirtMountain],
  cube: makeCube,
  ball: makeBall,
  castle: makeCastle,
  tower: makeTower,
  bridge: makeBridge,
  flower: makeFlower,
  cloud: makeCloud,
  car: makeCar,
  boat: makeBoat,
  mushroom: makeMushroom,
  fence: makeFence,
  lamp: makeLamp,
  cat: (params) => makeAnimal('cat', params.color, params.scale, 0, 0, 0),
  dog: (params) => makeAnimal('dog', params.color, params.scale, 0, 0, 0),
}

/** 某类型有多少种造型（属性面板显示"样式 1/3"用） */
function variantCount(type) {
  const b = BUILDERS[type]
  return Array.isArray(b) ? b.length : 1
}

/** 按词典解析出的参数造对应物体（P0-4 基础模式的核心） */
function makeByType(params) {
  const builder = BUILDERS[params.type]
  if (!builder) return makeCube(params.color, params.scale, 0, 0, 0)
  if (Array.isArray(builder)) {
    // 变体数组：按 variant（0 起）取造型，越界则取第一个
    const fn = builder[params.variant || 0] || builder[0]
    return fn(params.color, params.scale, 0, 0, 0)
  }
  return builder(params)
}

function makeCube(color, scale, x, y, z) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color })
  )
  mesh.position.set(x, y + 0.5 * scale, z)
  mesh.scale.setScalar(scale)
  return mesh
}

function makeBall(color, scale, x, y, z) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.6, 24, 24),
    new THREE.MeshStandardMaterial({ color })
  )
  mesh.position.set(x, y + 0.6 * scale, z)
  mesh.scale.setScalar(scale)
  return mesh
}

function makeRock(color, scale, x, y, z) {
  const mesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.6, 1),
    new THREE.MeshStandardMaterial({ color, flatShading: true })
  )
  mesh.position.set(x, y + 0.4 * scale, z)
  mesh.scale.setScalar(scale)
  return mesh
}

/** 尖石（rock variant 1）：不规则多面体拉伸的尖石头 */
function makeSharpRock(color, scale, x, y, z) {
  const mesh = new THREE.Mesh(
    new THREE.ConeGeometry(0.5, 0.9, 5),
    new THREE.MeshStandardMaterial({ color, flatShading: true })
  )
  mesh.position.set(x, y + 0.4 * scale, z)
  mesh.scale.setScalar(scale)
  return mesh
}

/** 简化的动物：身体 + 头 + 耳朵，够"能认出是只猫/狗"即可 */
function makeAnimal(type, color, scale, x, y, z) {
  const group = new THREE.Group()

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 0.7, 1.4),
    new THREE.MeshStandardMaterial({ color })
  )
  body.position.y = 0.5
  group.add(body)

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 16, 16),
    new THREE.MeshStandardMaterial({ color })
  )
  head.position.set(0, 0.9, 0.75)
  group.add(head)

  // 耳朵：猫是尖三角，狗是长耳（用不同形状区分）
  const earGeo =
    type === 'cat'
      ? new THREE.ConeGeometry(0.15, 0.3, 4)
      : new THREE.BoxGeometry(0.12, 0.4, 0.2)
  const earL = new THREE.Mesh(earGeo, new THREE.MeshStandardMaterial({ color }))
  earL.position.set(-0.2, 1.2, 0.75)
  const earR = new THREE.Mesh(earGeo, new THREE.MeshStandardMaterial({ color }))
  earR.position.set(0.2, 1.2, 0.75)
  group.add(earL, earR)

  group.position.set(x, y, z)
  group.scale.setScalar(scale)
  return group
}

/** 城堡：底座 + 主体 + 尖塔 */
function makeCastle(color, scale, x, y, z) {
  const group = new THREE.Group()

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.3, 0.6, 8),
    new THREE.MeshStandardMaterial({ color: 0x9e9e9e })
  )
  base.position.y = 0.3
  group.add(base)

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.9, 1.8, 8),
    new THREE.MeshStandardMaterial({ color })
  )
  body.position.y = 1.5
  group.add(body)

  const top = new THREE.Mesh(
    new THREE.ConeGeometry(0.9, 1.0, 8),
    new THREE.MeshStandardMaterial({ color: 0xb71c1c })
  )
  top.position.y = 2.9
  group.add(top)

  group.position.set(x, y, z)
  group.scale.setScalar(scale)
  return group
}

/** 塔：细长圆柱 + 尖顶 */
function makeTower(color, scale, x, y, z) {
  const group = new THREE.Group()
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.6, 2.5, 8),
    new THREE.MeshStandardMaterial({ color })
  )
  body.position.y = 1.25
  group.add(body)
  const top = new THREE.Mesh(
    new THREE.ConeGeometry(0.55, 0.8, 8),
    new THREE.MeshStandardMaterial({ color: 0xb71c1c })
  )
  top.position.y = 2.9
  group.add(top)
  group.position.set(x, y, z)
  group.scale.setScalar(scale)
  return group
}

/** 桥：拱形桥面 + 两侧护栏 */
function makeBridge(color, scale, x, y, z) {
  const group = new THREE.Group()
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(3, 0.25, 1.4),
    new THREE.MeshStandardMaterial({ color: 0x8d6e63 })
  )
  deck.position.y = 0.6
  group.add(deck)
  const rail = new THREE.Mesh(
    new THREE.BoxGeometry(3, 0.5, 0.15),
    new THREE.MeshStandardMaterial({ color })
  )
  rail.position.set(0, 1.1, 0.65)
  group.add(rail)
  const rail2 = rail.clone()
  rail2.position.z = -0.65
  group.add(rail2)
  group.position.set(x, y, z)
  group.scale.setScalar(scale)
  return group
}

/** 花：花茎 + 花瓣球 */
function makeFlower(color, scale, x, y, z) {
  const group = new THREE.Group()
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 1, 8),
    new THREE.MeshStandardMaterial({ color: 0x4caf50 })
  )
  stem.position.y = 0.5
  group.add(stem)
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 12, 12),
    new THREE.MeshStandardMaterial({ color })
  )
  head.position.y = 1.1
  group.add(head)
  group.position.set(x, y, z)
  group.scale.setScalar(scale)
  return group
}

/** 山：大圆锥 */
function makeMountain(color, scale, x, y, z) {
  const group = new THREE.Group()
  const peak = new THREE.Mesh(
    new THREE.ConeGeometry(1.4, 2.4, 6),
    new THREE.MeshStandardMaterial({ color: 0x6d7f8c, flatShading: true })
  )
  peak.position.y = 1.2
  group.add(peak)
  const snow = new THREE.Mesh(
    new THREE.ConeGeometry(0.5, 0.7, 6),
    new THREE.MeshStandardMaterial({ color: 0xffffff })
  )
  snow.position.y = 2.3
  group.add(snow)
  group.position.set(x, y, z)
  group.scale.setScalar(scale)
  return group
}

/** 土山（mountain variant 1）：无积雪的矮宽山丘 */
function makeDirtMountain(color, scale, x, y, z) {
  const group = new THREE.Group()
  const peak = new THREE.Mesh(
    new THREE.ConeGeometry(1.6, 1.8, 6),
    new THREE.MeshStandardMaterial({ color: 0x8d6e63, flatShading: true })
  )
  peak.position.y = 0.9
  group.add(peak)
  group.position.set(x, y, z)
  group.scale.setScalar(scale)
  return group
}

/** 云：几个扁球拼起来 */
function makeCloud(color, scale, x, y, z) {
  const group = new THREE.Group()
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff })
  const positions = [[-0.5, 0, 0], [0, 0.15, 0], [0.5, 0, 0]]
  positions.forEach((p) => {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 16), mat)
    puff.position.set(p[0], p[1], p[2])
    puff.scale.y = 0.6
    group.add(puff)
  })
  group.position.set(x, y + 2, z)
  group.scale.setScalar(scale)
  return group
}

/** 车：车身 + 四个轮子 */
function makeCar(color, scale, x, y, z) {
  const group = new THREE.Group()
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.6, 1.0),
    new THREE.MeshStandardMaterial({ color })
  )
  body.position.y = 0.6
  group.add(body)
  const cab = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.5, 0.9),
    new THREE.MeshStandardMaterial({ color: 0x42a5f5 })
  )
  cab.position.set(-0.2, 1.1, 0)
  group.add(cab)
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x212121 })
  const wheelGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.15, 12)
  const wheelPositions = [[-0.6, 0.22, 0.5], [0.6, 0.22, 0.5], [-0.6, 0.22, -0.5], [0.6, 0.22, -0.5]]
  wheelPositions.forEach((p) => {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat)
    wheel.rotation.z = Math.PI / 2
    wheel.position.set(p[0], p[1], p[2])
    group.add(wheel)
  })
  group.position.set(x, y, z)
  group.scale.setScalar(scale)
  return group
}

/** 船：船体 + 桅杆 */
function makeBoat(color, scale, x, y, z) {
  const group = new THREE.Group()
  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.5, 0.9),
    new THREE.MeshStandardMaterial({ color })
  )
  hull.position.y = 0.35
  group.add(hull)
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 1.6, 8),
    new THREE.MeshStandardMaterial({ color: 0x8d6e63 })
  )
  mast.position.y = 1.2
  group.add(mast)
  group.position.set(x, y, z)
  group.scale.setScalar(scale)
  return group
}

/** 蘑菇：菌柄 + 菌盖 */
function makeMushroom(color, scale, x, y, z) {
  const group = new THREE.Group()
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.3, 1, 12),
    new THREE.MeshStandardMaterial({ color: 0xf5f5dc })
  )
  stem.position.y = 0.5
  group.add(stem)
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.8, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color })
  )
  cap.position.y = 1.0
  group.add(cap)
  group.position.set(x, y, z)
  group.scale.setScalar(scale)
  return group
}

/** 栅栏：横杆 + 几根竖条 */
function makeFence(color, scale, x, y, z) {
  const group = new THREE.Group()
  const mat = new THREE.MeshStandardMaterial({ color: 0x8d6e63 })
  const bar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.15, 0.1), mat)
  bar.position.y = 0.7
  group.add(bar)
  const bar2 = bar.clone()
  bar2.position.y = 0.4
  group.add(bar2)
  for (let i = -1; i <= 1; i++) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1, 0.12), mat)
    post.position.set(i * 1.0, 0.5, 0)
    group.add(post)
  }
  group.position.set(x, y, z)
  group.scale.setScalar(scale)
  return group
}

/** 灯：灯杆 + 发光球 */
function makeLamp(color, scale, x, y, z) {
  const group = new THREE.Group()
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 2.4, 8),
    new THREE.MeshStandardMaterial({ color: 0x424242 })
  )
  pole.position.y = 1.2
  group.add(pole)
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xffd54f, emissive: 0xffd54f, emissiveIntensity: 0.6 })
  )
  bulb.position.y = 2.5
  group.add(bulb)
  group.position.set(x, y, z)
  group.scale.setScalar(scale)
  return group
}
