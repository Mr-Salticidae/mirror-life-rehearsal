import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useGame, Rank } from '../store'
import { rankOf } from '../lib/titles'
import RankSplash from '../components/RankSplash'
import { sfx } from '../lib/audio'

// 军人《守夜》：夜间靶场，鼠标视角+点击射击，60s
// 红色标靶 +10（爆头 ×2）；白色平民靶 -15；连中有 streak 加成
const DURATION = 60

export default function FpsRange() {
  const mountRef = useRef<HTMLDivElement>(null)
  const finishGame = useGame(s => s.finishGame)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(DURATION)
  const [locked, setLocked] = useState(false)
  const [over, setOver] = useState<Rank | null>(null)
  const stats = useRef({ score: 0, hit: 0, head: 0, miss: 0, civ: 0, streak: 0, best: 0 })
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    const mount = mountRef.current!
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true })
    } catch {
      // WebGL 不可用：跳过游戏直达报告，主流程不断
      finishGame(0, '完成了一夜坚守', 'B')
      return
    }
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x060a12)
    scene.fog = new THREE.Fog(0x060a12, 20, 90)
    const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 200)
    camera.position.set(0, 1.7, 0)

    // 灯光：冷月光 + 探照暖光
    scene.add(new THREE.HemisphereLight(0x6a86bc, 0x20242e, 3.0))
    scene.add(new THREE.AmbientLight(0x2a3448, 1.4))
    const moon = new THREE.DirectionalLight(0x8fb4e0, 2.2)
    moon.position.set(-20, 30, -10); scene.add(moon)
    const warm = new THREE.SpotLight(0xe8b878, 4000, 120, 0.55, 0.55)
    warm.position.set(0, 14, 8); warm.target.position.set(0, 0, -30)
    scene.add(warm, warm.target)

    // 地面 + 场地
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshStandardMaterial({ color: 0x2a323c, roughness: 0.9 }),
    )
    ground.rotation.x = -Math.PI / 2; scene.add(ground)
    // 远处围墙剪影
    for (let i = 0; i < 14; i++) {
      const h = 3 + Math.random() * 5
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(6, h, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x0c1016 }),
      )
      wall.position.set(-42 + i * 6.5, h / 2, -60 - Math.random() * 8)
      scene.add(wall)
    }
    // 雪：粒子
    const snowGeo = new THREE.BufferGeometry()
    const snowN = 800
    const snowPos = new Float32Array(snowN * 3)
    for (let i = 0; i < snowN; i++) {
      snowPos[i * 3] = (Math.random() - 0.5) * 80
      snowPos[i * 3 + 1] = Math.random() * 30
      snowPos[i * 3 + 2] = -Math.random() * 70
    }
    snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3))
    const snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({
      color: 0xaabbd0, size: 0.12, transparent: true, opacity: 0.7,
    }))
    scene.add(snow)

    // 靶子
    interface Target { grp: THREE.Group; civilian: boolean; born: number; life: number; dead: boolean }
    const targets: Target[] = []
    const mkTarget = (forceCiv?: boolean) => {
      const civilian = forceCiv ?? Math.random() < 0.28
      const grp = new THREE.Group()
      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.45, 1.1, 4, 12),
        new THREE.MeshStandardMaterial({
          color: civilian ? 0xd8d8d0 : 0xb03830,
          emissive: civilian ? 0x444440 : 0x581410,
          roughness: 0.6,
        }),
      )
      body.position.y = 1.05
      body.userData.part = 'body'
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.26, 12, 10),
        new THREE.MeshStandardMaterial({
          color: civilian ? 0xd8d8d0 : 0xd84838,
          emissive: civilian ? 0x444440 : 0x701810,
          roughness: 0.5,
        }),
      )
      head.position.y = 2.15
      head.userData.part = 'head'
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.65, 0.045, 8, 32),
        new THREE.MeshBasicMaterial({ color: civilian ? 0xffffff : 0xff5040 }),
      )
      ring.position.y = 1.05
      grp.add(body, head, ring)
      grp.position.set((Math.random() - 0.5) * 36, 0, -14 - Math.random() * 34)
      grp.scale.setScalar(0.01)
      scene.add(grp)
      const t = { grp, civilian, born: performance.now(), life: 2600 + Math.random() * 2200, dead: false }
      targets.push(t)
      return t
    }
    // 开场预置演示靶（不自动消失），让玩家锁定前就看清红/白区别
    mkTarget(false).life = Infinity
    mkTarget(true).life = Infinity

    // 视角控制（pointer lock）
    let yaw = 0, pitch = 0
    const onMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== renderer.domElement) return
      yaw -= e.movementX * 0.0022
      pitch -= e.movementY * 0.0022
      pitch = Math.max(-0.6, Math.min(0.6, pitch))
      yaw = Math.max(-1.1, Math.min(1.1, yaw))
    }
    const onLockChange = () => {
      const isLocked = document.pointerLockElement === renderer.domElement
      setLocked(isLocked)
      if (isLocked && startRef.current === null) startRef.current = performance.now() // 首次锁定才开始计时
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('pointerlockchange', onLockChange)
    const requestLock = () => renderer.domElement.requestPointerLock()
    renderer.domElement.addEventListener('click', requestLock)

    // 射击
    const ray = new THREE.Raycaster()
    const muzzle = new THREE.PointLight(0xffcc88, 0, 8)
    muzzle.position.set(0.3, 1.5, -1); camera.add(muzzle); scene.add(camera)
    const shoot = () => {
      if (endedRef.current) return
      if (document.pointerLockElement !== renderer.domElement) return
      sfx.shot()
      muzzle.intensity = 30
      setTimeout(() => { muzzle.intensity = 0 }, 60)
      ray.setFromCamera(new THREE.Vector2(0, 0), camera)
      const alive = targets.filter(t => !t.dead)
      const objs = alive.flatMap(t => t.grp.children)
      const hits = ray.intersectObjects(objs, false)
      const st = stats.current
      if (hits.length) {
        const hitObj = hits[0].object as THREE.Mesh
        const t = alive.find(tt => tt.grp.children.includes(hitObj))!
        t.dead = true
        if (t.civilian) {
          sfx.wrong(); st.civ++; st.streak = 0; st.score = Math.max(0, st.score - 15)
        } else {
          const headshot = hitObj.userData.part === 'head'
          sfx.hit(); st.hit++; st.streak++; st.best = Math.max(st.best, st.streak)
          if (headshot) st.head++
          const base = 10 + Math.min(st.streak - 1, 5) * 2
          st.score += headshot ? base * 2 : base
        }
        setScore(st.score)
      } else {
        st.miss++; st.streak = 0
      }
    }
    document.addEventListener('mousedown', shoot)

    // 主循环（首次锁定视角后才开始计时/出靶）
    let raf = 0
    let spawnAcc = 0, last = performance.now()
    let surged = false // 二段高潮只触发一次
    const endedRef = { current: false }
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const now = performance.now()
      const dt = Math.min(50, now - last); last = now
      const started = startRef.current !== null
      const elapsed = started ? (now - startRef.current!) / 1000 : 0
      const left = Math.max(0, DURATION - elapsed)
      setTimeLeft(Math.ceil(left))

      // 生成靶子：随时间加速；二段高潮（32s 起）平民大量混入，逼玩家看清再开枪
      if (started) {
        if (elapsed > 32 && !surged) { surged = true; sfx.heartbeat() }
        spawnAcc += dt
        const interval = Math.max(520, 1150 - elapsed * 10)
        if (spawnAcc > interval && targets.filter(t => !t.dead).length < 6) {
          spawnAcc = 0
          mkTarget(Math.random() < (elapsed > 32 ? 0.48 : 0.28))
        }
      }
      // 靶子生命周期
      for (const t of targets) {
        const age = now - t.born
        if (t.dead) {
          t.grp.scale.multiplyScalar(0.82)
          t.grp.rotation.z += 0.15
          if (t.grp.scale.x < 0.02) { scene.remove(t.grp); }
        } else {
          t.grp.scale.setScalar(Math.min(1, t.grp.scale.x + dt * 0.004))
          if (age > t.life) { t.dead = true; if (!t.civilian) stats.current.streak = 0 }
        }
      }
      // 雪
      const p = snow.geometry.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < snowN; i++) {
        let y = p.getY(i) - dt * 0.0035
        if (y < 0) y = 30
        p.setY(i, y)
      }
      p.needsUpdate = true

      camera.rotation.set(pitch, yaw, 0, 'YXZ')

      if (started && left <= 0 && !endedRef.current) {
        endedRef.current = true
        document.exitPointerLock()
        const st = stats.current
        const rank = rankOf('fps', st.score)
        setOver(rank)
        sfx.confirm()
        setTimeout(() => finishGame(st.score,
          `命中 ${st.hit} 个标靶（爆头 ${st.head} 次），最长连击 ${st.best}，误伤 ${st.civ} 次`, rank), 3000)
      }
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
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mousedown', shoot)
      document.removeEventListener('pointerlockchange', onLockChange)
      window.removeEventListener('resize', onResize)
      if (document.pointerLockElement) document.exitPointerLock()
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
        <span>得分 <b>{score}</b></span>
        <span>剩余 <b>{timeLeft}s</b></span>
      </div>
      <div className="crosshair" />
      {/* 二段高潮警告：32s 起平民混入（timeLeft 60→28 为触发点，横幅显示约 5s） */}
      {locked && !over && timeLeft <= 28 && timeLeft > 23 && (
        <div className="surge-banner">人 群 涌 入 靶 区 —— 看 清 再 开 枪</div>
      )}
      {!locked && !over && (
        <div className="game-overlay-msg" style={{ pointerEvents: 'none' }}>
          <div className="big">守 夜</div>
          <div className="game-hint">点击画面锁定视角 · 红色标靶射击（打头×2）· 白色平民勿伤</div>
        </div>
      )}
      {over && <RankSplash rank={over} title="考 核 结 束" sub={`得分 ${score}`} />}
    </div>
  )
}
