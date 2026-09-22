import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

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

    // 7. 几个预制几何体占位（树 / 房子）
    scene.add(makeTree(0x4caf50, 0.8, -3, 0, 1))
    scene.add(makeTree(0x66bb6a, 1.2, 3, 0, -2))
    scene.add(makeHouse(0xf3a63b, 2, 0, 3))

    // 7.1 向外部暴露"往场景里生成物体"的方法
    let spawnCount = 0
    if (sceneRef) {
      sceneRef.current = {
        spawn(params) {
          const mesh = makeByType(params)
          // 每个新物体沿一条弧线排开，避免全叠在原点
          spawnCount += 1
          mesh.position.x += (spawnCount % 5) * 2.2 - 4
          mesh.position.z += Math.floor(spawnCount / 5) * 2.2 - 2
          scene.add(mesh)
          return true
        },
      }
    }

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

/**
 * 素材注册表：新增一种可生成的物体，只需在这里加一行。
 * 键 = 词典里的类型名；值 = 造物函数（参数：{ type, color, scale }）。
 * 例如想加 "car"：先写好 makeCar()，再在这里加 `car: makeCar` 即可。
 */
const BUILDERS = {
  tree: makeTree,
  house: makeHouse,
  cube: makeCube,
  ball: makeBall,
  rock: makeRock,
  cat: (params) => makeAnimal('cat', params.color, params.scale, 0, 0, 0),
  dog: (params) => makeAnimal('dog', params.color, params.scale, 0, 0, 0),
}

/** 按词典解析出的参数造对应物体（P0-4 基础模式的核心） */
function makeByType(params) {
  const builder = BUILDERS[params.type]
  return builder ? builder(params) : makeCube(params.color, params.scale, 0, 0, 0)
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
