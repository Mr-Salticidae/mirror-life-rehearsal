import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useGame, Rank } from '../store'
import { rankOf } from '../lib/titles'
import RankSplash from '../components/RankSplash'
import { sfx } from '../lib/audio'

// 宇航员《失重》：一维进近对接。← →/A D 微调推力，空格强制动（更耗燃料）。
// 对接窗口：距离 ≤6m 且 |相对速度| ≤1.2m/s，保持 3s = 成功；触碰(距离<0)=碰撞反弹。
// 评级：综合分 = 成功40 + 燃料%×0.6；S ≥85 且零碰撞；未对接超时 = B。
const DURATION = 90

export default function Docking() {
  const mountRef = useRef<HTMLDivElement>(null)
  const finishGame = useGame(s => s.finishGame)
  const [hud, setHud] = useState({ dist: 120, vel: 8, fuel: 100, hold: 0 })
  const [timeLeft, setTimeLeft] = useState(DURATION)
  const [over, setOver] = useState<{ rank: Rank; ok: boolean } | null>(null)
  const [ptrHint, setPtrHint] = useState<'retro' | 'brake' | 'accel' | null>(null)

  useEffect(() => {
    const mount = mountRef.current!
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true })
    } catch {
      finishGame(40, '完成了一次进近', 'B')
      return
    }
    renderer.setSize(innerWidth, innerHeight)
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x020409)
    const camera = new THREE.PerspectiveCamera(64, innerWidth / innerHeight, 0.1, 3000)

    scene.add(new THREE.HemisphereLight(0x4a6088, 0x0a0e18, 1.6))
    const sun = new THREE.DirectionalLight(0xfff0d8, 2.4)
    sun.position.set(60, 25, 40); scene.add(sun)

    // 星空
    const starGeo = new THREE.BufferGeometry()
    const N = 1600
    const sp = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      const r = 800 + Math.random() * 1200
      const th = Math.random() * Math.PI * 2, ph = Math.acos(Math.random() * 2 - 1)
      sp[i * 3] = r * Math.sin(ph) * Math.cos(th)
      sp[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th)
      sp[i * 3 + 2] = r * Math.cos(ph)
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3))
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xcdd8ee, size: 1.4, sizeAttenuation: false })))

    // 地球（程序化贴图）
    const ecv = document.createElement('canvas'); ecv.width = 512; ecv.height = 256
    const ectx = ecv.getContext('2d')!
    const eg = ectx.createLinearGradient(0, 0, 0, 256)
    eg.addColorStop(0, '#0a2a52'); eg.addColorStop(0.5, '#1a5a9a'); eg.addColorStop(1, '#0a3a6a')
    ectx.fillStyle = eg; ectx.fillRect(0, 0, 512, 256)
    let es = 7
    const ernd = () => { es = (es * 1103515245 + 12345) >>> 0; return es / 4294967296 }
    ectx.fillStyle = '#e8ecf0aa'
    for (let i = 0; i < 40; i++) {
      const x = ernd() * 512, y = ernd() * 256, w = 20 + ernd() * 90, h = 6 + ernd() * 16
      ectx.beginPath(); ectx.ellipse(x, y, w, h, ernd() * 3, 0, Math.PI * 2); ectx.fill()
    }
    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(220, 48, 32),
      new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(ecv), roughness: 0.9 }),
    )
    earth.position.set(0, -290, -140)
    scene.add(earth)

    // 空间站（远处，玩家沿 -z 接近）
    const station = new THREE.Group()
    const hullMat = new THREE.MeshStandardMaterial({ color: 0xb8c4d4, roughness: 0.35, metalness: 0.7 })
    const core = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 14, 20), hullMat)
    core.rotation.z = Math.PI / 2
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x2a4a8a, roughness: 0.4, metalness: 0.5, emissive: 0x0a1a3a })
    for (const side of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(10, 0.15, 4), panelMat)
      p.position.set(side * 9, 0, 0)
      station.add(p)
    }
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.6, 0.22, 12, 36),
      new THREE.MeshStandardMaterial({ color: 0x8a94a8, emissive: 0x223344, roughness: 0.4 }),
    )
    ring.position.set(0, 0, 6.9)
    const ringGlow = new THREE.PointLight(0x44ff88, 0, 20)
    ringGlow.position.copy(ring.position)
    station.add(core, ring, ringGlow)
    scene.add(station)

    // 状态
    const st = { dist: 120, vel: 8, fuel: 100, hold: 0, corrections: 0, collisions: 0, docked: false, wobble: 0 }
    const keys = { retro: false, accel: false, brake: false }
    const onDown = (e: KeyboardEvent) => {
      // 修正计数 = 推进键按下沿（长按不重复计）
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
        if (!keys.retro && !ended.current) st.corrections++
        keys.retro = true
      }
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
        if (!keys.accel && !ended.current) st.corrections++
        keys.accel = true
      }
      if (e.key === ' ') {
        if (!keys.brake && !ended.current) st.corrections++
        keys.brake = true; e.preventDefault()
      }
    }
    const onUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') keys.retro = false
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') keys.accel = false
      if (e.key === ' ') keys.brake = false
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)

    // 鼠标/触屏兜底：按住屏幕 左/中/右 = 减速/制动/加速（键盘焦点丢失或展位无键盘时仍可玩）
    type Zone = 'retro' | 'brake' | 'accel'
    let ptrZone: Zone | null = null
    const zoneAt = (x: number): Zone => x < innerWidth * 0.38 ? 'retro' : x > innerWidth * 0.62 ? 'accel' : 'brake'
    const press = (z: Zone) => {
      if (!keys[z] && !ended.current) st.corrections++
      keys[z] = true; ptrZone = z; setPtrHint(z)
    }
    const release = () => {
      if (ptrZone) { keys[ptrZone] = false; ptrZone = null; setPtrHint(null) }
    }
    const onPtrDown = (e: PointerEvent) => press(zoneAt(e.clientX))
    const onPtrMove = (e: PointerEvent) => {
      if (!ptrZone) return
      const z = zoneAt(e.clientX)
      if (z !== ptrZone) { keys[ptrZone] = false; press(z) }
    }
    window.addEventListener('pointerdown', onPtrDown)
    window.addEventListener('pointermove', onPtrMove)
    window.addEventListener('pointerup', release)
    window.addEventListener('pointercancel', release)

    let thrustSfxAcc = 0
    const t0 = performance.now()
    let last = t0, raf = 0
    const ended = { current: false }
    const end = (ok: boolean) => {
      if (ended.current) return
      ended.current = true
      const score = Math.round((ok ? 40 : 0) + st.fuel * 0.6)
      let rank = rankOf('dock', score)
      if (rank === 'S' && st.collisions > 0) rank = 'A' // S 要求一次成型
      if (!ok) rank = 'B'
      setOver({ rank, ok })
      sfx.confirm()
      setTimeout(() => finishGame(score,
        ok ? `对接成功 · 燃料剩余 ${Math.round(st.fuel)}% · 修正 ${st.corrections} 次${st.collisions ? ` · 碰撞 ${st.collisions} 次` : ' · 一次成型'}`
           : `进近超时 · 最近距离 ${Math.max(0, st.dist).toFixed(1)}m`, rank), 3000)
    }

    const loop = () => {
      raf = requestAnimationFrame(loop)
      const now = performance.now()
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const elapsed = (now - t0) / 1000
      const left = Math.max(0, DURATION - elapsed)
      setTimeLeft(Math.ceil(left))

      if (!ended.current && !st.docked) {
        // 推力
        let burning = false
        if (st.fuel > 0) {
          if (keys.retro) { st.vel -= 3.2 * dt; st.fuel -= 7 * dt; burning = true }
          if (keys.accel) { st.vel += 3.2 * dt; st.fuel -= 7 * dt; burning = true }
          if (keys.brake) { st.vel += -Math.sign(st.vel) * Math.min(Math.abs(st.vel), 6.5 * dt); st.fuel -= 15 * dt; burning = true }
          if (burning) {
            thrustSfxAcc += dt
            if (thrustSfxAcc > 0.28) { thrustSfxAcc = 0; sfx.whoosh() }
          }
        }
        st.fuel = Math.max(0, st.fuel)
        st.dist -= st.vel * dt
        // 碰撞
        if (st.dist < 0) {
          st.dist = 1.2
          st.vel = -Math.abs(st.vel) * 0.45
          st.collisions++
          st.wobble = 1
          sfx.crash()
        }
        // 对接窗口
        const inWindow = st.dist <= 6 && Math.abs(st.vel) <= 1.2 && st.dist >= 0
        st.hold = inWindow ? st.hold + dt : 0
        ringGlow.intensity = inWindow ? 26 : 0
        ;(ring.material as THREE.MeshStandardMaterial).emissive.setHex(inWindow ? 0x22aa55 : 0x223344)
        if (inWindow && st.hold >= 3) { st.docked = true; sfx.ignite(); end(true) }
        if (left <= 0) end(false)
        setHud({ dist: st.dist, vel: st.vel, fuel: st.fuel, hold: st.hold })
      }

      // 相机 = 飞船视角：失重微漂 + 碰撞晃动
      st.wobble = Math.max(0, st.wobble - dt * 1.4)
      const sway = Math.sin(elapsed * 0.7) * 0.28 + (Math.random() - 0.5) * st.wobble * 0.8
      const bob = Math.cos(elapsed * 0.5) * 0.2 + (Math.random() - 0.5) * st.wobble * 0.8
      camera.position.set(sway, bob, st.dist + 10)
      camera.lookAt(0, 0, 0)
      station.rotation.z = elapsed * 0.02
      earth.rotation.y = elapsed * 0.008

      renderer.render(scene, camera)
    }
    loop()

    const onResize = () => {
      camera.aspect = innerWidth / innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(innerWidth, innerHeight)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      window.removeEventListener('pointerdown', onPtrDown)
      window.removeEventListener('pointermove', onPtrMove)
      window.removeEventListener('pointerup', release)
      window.removeEventListener('pointercancel', release)
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

  const inWindow = hud.dist <= 6 && Math.abs(hud.vel) <= 1.2
  return (
    <div ref={mountRef} style={{ position: 'absolute', inset: 0 }}>
      <div className="game-hud">
        <span>距离 <b>{Math.max(0, hud.dist).toFixed(1)}m</b></span>
        <span>相对速度 <b>{hud.vel.toFixed(2)}m/s</b></span>
        <span>燃料 <b>{Math.round(hud.fuel)}%</b></span>
        <span>剩余 <b>{timeLeft}s</b></span>
      </div>
      {inWindow && !over && (
        <div style={{ position: 'absolute', top: '14vh', left: 0, right: 0, textAlign: 'center',
          fontSize: 14, letterSpacing: '.4em', color: '#6ae8a0', zIndex: 30,
          textShadow: '0 0 16px rgba(80,230,140,.6)' }}>
          对接窗口 · 保持 {Math.max(0, 3 - hud.hold).toFixed(1)}s
        </div>
      )}
      {hud.dist >= 118 && !over && (
        <div className="game-overlay-msg" style={{ pointerEvents: 'none', background: 'rgba(0,0,0,.5)' }}>
          <div className="big">失 重</div>
          <div className="game-hint">← 减速 · → 加速 · 空格强制动（或按住屏幕 左/中/右）</div>
          <div className="game-hint" style={{ opacity: .7 }}>距离 ≤6m 且速度 ≤1.2 保持 3 秒 = 对接</div>
        </div>
      )}
      {/* 触控操作区：底部三分格提示，按住时对应格点亮 */}
      {!over && (
        <div className="touch-zones" aria-hidden>
          <span className={ptrHint === 'retro' ? 'on' : ''}>◂ 减 速</span>
          <span className={ptrHint === 'brake' ? 'on' : ''}>制 动</span>
          <span className={ptrHint === 'accel' ? 'on' : ''}>加 速 ▸</span>
        </div>
      )}
      {over && <RankSplash rank={over.rank} title={over.ok ? '对 接 成 功' : '进 近 超 时'}
        sub={over.ok ? '欢迎回家，宇航员' : '地面站说：下次一定'} />}
    </div>
  )
}
