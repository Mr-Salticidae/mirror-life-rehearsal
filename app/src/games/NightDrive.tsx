import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useGame, Rank } from '../store'
import { rankOf } from '../lib/titles'
import { loadModel, cloneFit } from '../lib/models'
import RankSplash from '../components/RankSplash'
import { sfx } from '../lib/audio'

// 车流模型池（Kenney Car Kit，载入前用程序化盒车兜底）
const TRAFFIC_MODELS = ['sedan', 'taxi', 'van', 'suv', 'police', 'delivery', 'hatchback-sports']

// 赛车手《夜环线》：雨夜三车道，←→/AD 变道躲车流，蓝色氮气加速，20s 距离计分（展会节奏，主导定）
const DURATION = 15
const LANES = [-3.2, 0, 3.2]
// 模块加载即预取赛车模型：玩家走完序章进游戏时通常已缓存，配合下方 await → 第一帧即精细模型
loadModel('models/cars/race.glb')

export default function NightDrive() {
  const mountRef = useRef<HTMLDivElement>(null)
  const finishGame = useGame(s => s.finishGame)
  const [dist, setDist] = useState(0)
  const [timeLeft, setTimeLeft] = useState(DURATION)
  const [speedKmh, setSpeedKmh] = useState(0)
  const [over, setOver] = useState<Rank | null>(null)

  useEffect(() => {
    const mount = mountRef.current!
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true })
    } catch {
      // WebGL 不可用：跳过游戏直达报告，主流程不断
      finishGame(0, '完成了一段夜路', 'B')
      return
    }
    renderer.setSize(innerWidth, innerHeight)
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x04060d)
    scene.fog = new THREE.Fog(0x04060d, 30, 160)
    const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.1, 300)

    scene.add(new THREE.HemisphereLight(0x3a5078, 0x0a0e16, 2.4))
    scene.add(new THREE.AmbientLight(0x1a2438, 1.2))

    // 路面
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 400),
      new THREE.MeshStandardMaterial({ color: 0x14181f, roughness: 0.4, metalness: 0.3 }),
    )
    road.rotation.x = -Math.PI / 2
    road.position.z = -150
    scene.add(road)
    // 车道线（滚动）
    const dashes: THREE.Mesh[] = []
    const dashMat = new THREE.MeshBasicMaterial({ color: 0x8a94a8 })
    for (const lx of [-1.6, 1.6]) {
      for (let i = 0; i < 30; i++) {
        const d = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 3), dashMat)
        d.rotation.x = -Math.PI / 2
        d.position.set(lx, 0.01, -i * 12)
        scene.add(d); dashes.push(d)
      }
    }
    // （路侧路灯 / 路缘护栏已按需求移除，不再生成）
    // 雨
    const rainN = 900
    const rainGeo = new THREE.BufferGeometry()
    const rp = new Float32Array(rainN * 3)
    for (let i = 0; i < rainN; i++) {
      rp[i * 3] = (Math.random() - 0.5) * 40
      rp[i * 3 + 1] = Math.random() * 20
      rp[i * 3 + 2] = -Math.random() * 100
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rp, 3))
    const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({
      color: 0x6a88b8, size: 0.06, transparent: true, opacity: 0.6,
    }))
    scene.add(rain)

    // 玩家车（简单风格化楔形）
    const car = new THREE.Group()
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xc03028, emissive: 0x300806, roughness: 0.3, metalness: 0.6 })
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 3.4), bodyMat)
    chassis.position.y = 0.45
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.42, 1.6),
      new THREE.MeshStandardMaterial({ color: 0x10141c, roughness: 0.1, metalness: 0.8 }))
    cabin.position.set(0, 0.85, 0.1)
    const tail = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.1),
      new THREE.MeshBasicMaterial({ color: 0xff2818 }))
    tail.position.set(0, 0.62, 1.72)
    const head1 = new THREE.SpotLight(0xcfe0ff, 260, 60, 0.42, 0.5)
    head1.position.set(0, 0.7, -1.6); head1.target.position.set(0, 0, -30)
    car.add(tail, head1, head1.target)   // 车体待模型就绪后挂载（见循环启动处），灯光先就位照亮路面
    scene.add(car)

    // 车流模型池预载
    const trafficPool: THREE.Group[] = []
    for (const n of TRAFFIC_MODELS) loadModel(`models/cars/${n}.glb`).then(m => { if (m) trafficPool.push(m) })

    // 对手车
    interface Traffic { grp: THREE.Group; lane: number; speed: number }
    const traffic: Traffic[] = []
    const mkTraffic = (z: number) => {
      const lane = Math.floor(Math.random() * 3)
      const grp = new THREE.Group()
      if (trafficPool.length) {
        // 模型池就绪：随机取一辆（同向行驶，与玩家车同朝向）
        grp.add(cloneFit(trafficPool[Math.floor(Math.random() * trafficPool.length)], 3.2, true))
      } else {
        const hue = Math.random()
        const b = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 3.2),
          new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(hue, 0.4, 0.35), roughness: 0.4, metalness: 0.5 }))
        b.position.y = 0.5
        grp.add(b)
      }
      const t = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.1),
        new THREE.MeshBasicMaterial({ color: 0xff3020 }))
      t.position.set(0, 0.65, 1.62)
      grp.add(t)
      grp.position.set(LANES[lane], 0, z)
      scene.add(grp)
      traffic.push({ grp, lane, speed: 16 + Math.random() * 8 })
    }
    for (let i = 0; i < 7; i++) mkTraffic(-40 - i * 22)

    // 氮气球
    interface Nitro { mesh: THREE.Mesh; lane: number }
    const nitros: Nitro[] = []
    const nitroMat = new THREE.MeshBasicMaterial({ color: 0x54c8ff })
    const mkNitro = (z: number) => {
      const lane = Math.floor(Math.random() * 3)
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.42), nitroMat)
      m.position.set(LANES[lane], 0.9, z)
      scene.add(m)
      nitros.push({ mesh: m, lane })
    }
    for (let i = 0; i < 3; i++) mkNitro(-70 - i * 60)

    // 输入
    let targetLane = 1
    const steer = (dir: -1 | 1) => {
      targetLane = Math.max(0, Math.min(2, targetLane + dir))
      sfx.click()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') steer(-1)
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') steer(1)
    }
    // 鼠标/触屏兜底：点按屏幕左/右半 = 向左/右变道
    const onPtr = (e: PointerEvent) => steer(e.clientX < innerWidth / 2 ? -1 : 1)
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPtr)

    // 主循环
    const state = { dist: 0, speed: 26, nitro: 0, crashes: 0, nitroTaken: 0, shake: 0 }
    let t0 = 0
    let last = 0
    let raf = 0
    let disposed = false
    const ended = { current: false }
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const now = performance.now()
      const realDt = Math.min(0.05, (now - last) / 1000); last = now
      const elapsed = (now - t0) / 1000
      const left = Math.max(0, DURATION - elapsed)
      setTimeLeft(Math.ceil(left))
      // 终点冲刺慢镜：最后 2.2 秒世界放慢，镜头贴近
      const slowmo = left > 0 && left <= 2.2
      const dt = slowmo ? realDt * 0.35 : realDt

      // 速度：基础提速 + 氮气
      const base = 26 + elapsed * 1.5 // 提速斜率按 20s 版放大（原 60s 版 0.5/s，保持终速一致的速度弧线）
      state.nitro = Math.max(0, state.nitro - dt)
      const speed = base * (state.nitro > 0 ? 1.65 : 1)
      state.speed += (speed - state.speed) * dt * 3
      state.dist += state.speed * dt
      setDist(Math.floor(state.dist))
      setSpeedKmh(Math.floor(state.speed * 3.6))

      // 车横向移动
      const tx = LANES[targetLane]
      car.position.x += (tx - car.position.x) * dt * 8
      car.rotation.z = (tx - car.position.x) * -0.06
      car.rotation.y = (tx - car.position.x) * -0.04

      // 相机跟随 + 震动（慢镜时拉低贴近，电影感）
      state.shake = Math.max(0, state.shake - dt * 3)
      const shx = (Math.random() - 0.5) * state.shake, shy = (Math.random() - 0.5) * state.shake
      const camY = slowmo ? 1.6 : 3.1, camZ = slowmo ? 5.6 : 7.5
      camera.position.set(car.position.x * 0.6 + shx, camY + shy, camZ)
      camera.lookAt(car.position.x * 0.8, 1, -12)
      camera.fov = 72 + (state.nitro > 0 ? 8 : 0) + (state.speed - 26) * 0.15 - (slowmo ? 10 : 0)
      camera.updateProjectionMatrix()

      // 世界滚动
      const dz = state.speed * dt
      for (const d of dashes) { d.position.z += dz; if (d.position.z > 6) d.position.z -= 360 }
      for (const t of [...traffic]) { // 快照遍历：splice 原数组不会跳过下一辆
        t.grp.position.z += (state.speed - t.speed) * dt
        if (t.grp.position.z > 10) {
          scene.remove(t.grp)
          traffic.splice(traffic.indexOf(t), 1)
          mkTraffic(-160 - Math.random() * 40)
        }
      }
      if (traffic.length < 7 && Math.random() < 0.02) mkTraffic(-180)
      for (const n of nitros) {
        n.mesh.position.z += dz
        n.mesh.rotation.y += dt * 4
        if (n.mesh.position.z > 8) { n.mesh.position.z = -200 - Math.random() * 60; n.lane = Math.floor(Math.random() * 3); n.mesh.position.x = LANES[n.lane] }
      }
      // 雨滚动
      const rpp = rain.geometry.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < rainN; i++) {
        let y = rpp.getY(i) - dt * 22
        let z = rpp.getZ(i) + dz
        if (y < 0) y = 20
        if (z > 5) z -= 100
        rpp.setY(i, y); rpp.setZ(i, z)
      }
      rpp.needsUpdate = true

      // 碰撞
      if (!ended.current) {
        for (const t of traffic) {
          if (Math.abs(t.grp.position.z - car.position.z) < 2.6 &&
              Math.abs(t.grp.position.x - car.position.x) < 1.5) {
            t.grp.position.z = -180
            state.crashes++
            state.dist = Math.max(0, state.dist - 60)
            state.shake = 0.8
            sfx.crash()
          }
        }
        for (const n of nitros) {
          if (Math.abs(n.mesh.position.z - car.position.z) < 2 &&
              Math.abs(n.mesh.position.x - car.position.x) < 1.4) {
            n.mesh.position.z = -220
            state.nitro = 3
            state.nitroTaken++
            sfx.nitro()
          }
        }
      }

      if (left <= 0 && !ended.current) {
        ended.current = true
        const d = Math.floor(state.dist)
        const rank = rankOf('race', d)
        setOver(rank)
        sfx.confirm()
        setTimeout(() => finishGame(d,
          `冲出 ${d} 米，氮气 ${state.nitroTaken} 次，碰撞 ${state.crashes} 次`, rank), 3000)
      }
      renderer.render(scene, camera)
    }
    // 赛车模型就绪后再开赛（顶层已预载，通常即时；离线/失败用楔形兜底）→ 第一帧即精细模型、永不先显楔形
    loadModel('models/cars/race.glb').then(m => {
      if (disposed) return
      if (m) car.add(cloneFit(m, 3.6, true))
      else car.add(chassis, cabin)
      t0 = performance.now(); last = t0
      loop()
    })

    const onResize = () => {
      camera.aspect = innerWidth / innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(innerWidth, innerHeight)
    }
    window.addEventListener('resize', onResize)

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPtr)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      scene.traverse(o => {
        const m = o as THREE.Mesh
        if (m.geometry) m.geometry.dispose()
        if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach(mm => mm.dispose())
      })
      mount.removeChild(renderer.domElement)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div ref={mountRef} style={{ position: 'absolute', inset: 0 }}>
      <div className="game-hud">
        <span>里程 <b>{dist}m</b></span>
        <span><b>{speedKmh}</b> km/h</span>
        <span>剩余 <b>{timeLeft}s</b></span>
      </div>
      {over && <RankSplash rank={over} title="冲 线" sub={`${dist} 米`} />}
    </div>
  )
}
