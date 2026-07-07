import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useGame, Rank } from '../store'
import { rankOf } from '../lib/titles'
import { loadModel } from '../lib/models'
import RankSplash from '../components/RankSplash'
import { sfx } from '../lib/audio'

// 军人《守夜》：夜间靶场，鼠标视角+点击射击，20s（展会节奏，主导定）
// 红色标靶 +10（爆头 ×2）；白色平民靶 -15；连中有 streak 加成
const DURATION = 20
const SURGE_AT = 11 // 二段高潮起点（原 60s 版为 32s，按比例保持"过半后混入"的节拍）

export default function FpsRange() {
  const mountRef = useRef<HTMLDivElement>(null)
  const finishGame = useGame(s => s.finishGame)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(DURATION)
  const [locked, setLocked] = useState(false)
  const [fallback, setFallback] = useState(false) // pointer lock 不可用时的无锁瞄准模式
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

    // 靶子：人形立牌（像素立绘 + 红/白靶板，射击场纸靶质感；立绘载入前纯靶板也成立）
    const texLoader = new THREE.TextureLoader()
    const charTexs: { tex: THREE.Texture; aspect: number }[] = []
    for (const n of ['char_biker', 'char_punk', 'char_cyborg']) {
      texLoader.load(`${import.meta.env.BASE_URL}sprites/${n}.png`, t => {
        // 序列帧首帧（48×48 方帧）内按 alpha 求角色实际包围盒，紧致裁切保证居中与真实宽高比
        const img = t.image as HTMLImageElement
        const fh = img.height, fw = fh
        const cv2 = document.createElement('canvas')
        cv2.width = fw; cv2.height = fh
        const c2 = cv2.getContext('2d')!
        c2.drawImage(img, 0, 0, fw, fh, 0, 0, fw, fh)
        const d = c2.getImageData(0, 0, fw, fh).data
        let minX = fw, maxX = 0, minY = fh, maxY = 0
        for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
          if (d[(y * fw + x) * 4 + 3] > 16) {
            if (x < minX) minX = x; if (x > maxX) maxX = x
            if (y < minY) minY = y; if (y > maxY) maxY = y
          }
        }
        if (maxX <= minX || maxY <= minY) { minX = 0; maxX = fw - 1; minY = 0; maxY = fh - 1 }
        t.repeat.set((maxX - minX + 1) / img.width, (maxY - minY + 1) / fh)
        t.offset.set(minX / img.width, (fh - 1 - maxY) / fh)
        t.magFilter = THREE.NearestFilter
        t.colorSpace = THREE.SRGBColorSpace
        charTexs.push({ tex: t, aspect: (maxX - minX + 1) / (maxY - minY + 1) })
      })
    }
    interface Target { grp: THREE.Group; civilian: boolean; born: number; life: number; dead: boolean }
    const targets: Target[] = []
    const mkTarget = (forceCiv?: boolean) => {
      const civilian = forceCiv ?? Math.random() < 0.28
      const grp = new THREE.Group()
      const boardMat = new THREE.MeshStandardMaterial({
        color: civilian ? 0xe0ded6 : 0xb03830,
        emissive: civilian ? 0x4a4a44 : 0x581410,
        roughness: 0.7, side: THREE.DoubleSide,
      })
      // 靶板分身/头两块，命中区语义与旧版一致（打头×2）；板即敌我颜色信号
      const body = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.4), boardMat)
      body.position.y = 0.85
      body.userData.part = 'body'
      const head = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.5), boardMat)
      head.position.y = 1.82
      head.userData.part = 'head'
      // 支架
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.4, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x2a2e36, roughness: 0.9 }),
      )
      post.position.y = 0.12
      // 像素角色立绘（主视觉，不参与射线判定）：紧致裁切后按真实比例建面，脚底落地
      if (charTexs.length) {
        const { tex, aspect } = charTexs[Math.floor(Math.random() * charTexs.length)]
        const h = 1.9
        const sprite = new THREE.Mesh(
          new THREE.PlaneGeometry(h * aspect, h),
          new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide }),
        )
        sprite.position.set(0, h / 2, 0.04)
        sprite.raycast = () => { /* 立绘不挡子弹，命中判定只认靶板 */ }
        grp.add(sprite)
      }
      grp.add(body, head, post)
      grp.position.set((Math.random() - 0.5) * 36, 0, -14 - Math.random() * 34)
      grp.lookAt(0, 0, 0) // 立牌面向玩家
      grp.rotation.x = 0; grp.rotation.z = 0
      grp.scale.setScalar(0.01)
      scene.add(grp)
      const t = { grp, civilian, born: performance.now(), life: 2600 + Math.random() * 2200, dead: false }
      targets.push(t)
      return t
    }
    // 开场预置演示靶（不自动消失），让玩家锁定前就看清红/白区别
    // 延迟到立绘贴图就位后生成（350ms 足够本地资源）,避免演示靶光板无人
    const demoTimer = window.setTimeout(() => {
      if (endedRef.current) return
      mkTarget(false).life = Infinity
      mkTarget(true).life = Infinity
    }, 350)

    // 视角控制（pointer lock；不可用则降级为鼠标位置瞄准，防整线卡死——QA D-02）
    let yaw = 0, pitch = 0
    const fallbackRef = { current: false }
    const onMove = (e: MouseEvent) => {
      if (document.pointerLockElement === renderer.domElement) {
        yaw -= e.movementX * 0.0022
        pitch -= e.movementY * 0.0022
      } else if (fallbackRef.current) {
        // 无锁模式：屏幕位置直接映射视角（中心=正前方）
        yaw = -(e.clientX / innerWidth - 0.5) * 2.2
        pitch = -(e.clientY / innerHeight - 0.5) * 1.2
      } else return
      pitch = Math.max(-0.6, Math.min(0.6, pitch))
      yaw = Math.max(-1.1, Math.min(1.1, yaw))
    }
    const enableFallback = () => {
      if (fallbackRef.current) return
      fallbackRef.current = true
      setFallback(true)
      if (startRef.current === null) startRef.current = performance.now()
    }
    const onLockChange = () => {
      const isLocked = document.pointerLockElement === renderer.domElement
      setLocked(isLocked)
      if (isLocked && startRef.current === null) startRef.current = performance.now() // 首次锁定才开始计时
    }
    const onLockError = () => enableFallback()
    document.addEventListener('mousemove', onMove)
    document.addEventListener('pointerlockchange', onLockChange)
    document.addEventListener('pointerlockerror', onLockError)
    const requestLock = () => {
      try {
        // 现代浏览器返回 Promise，拒绝即降级；老浏览器走 pointerlockerror 事件
        const p = renderer.domElement.requestPointerLock() as unknown as Promise<void> | undefined
        if (p && typeof p.catch === 'function') p.catch(enableFallback)
      } catch { enableFallback() }
    }
    renderer.domElement.addEventListener('click', requestLock)

    // 持枪视图（同事手枪模型，scripts/fbx2glb.mjs 清洗产物）：挂相机右下，射击带后座
    // 载入前/失败时保持无枪现状，射击判定不受影响（射线只认靶板）
    const gunGrp = new THREE.Group()
    gunGrp.position.set(0.26, -0.2, -0.58)
    camera.add(gunGrp)
    let gunKick = 0
    loadModel('models/props/pistol.glb').then(m => {
      if (!m) return
      const gun = m.clone(true)
      gun.rotation.y = Math.PI / 2 + 0.42 // GLB 枪口朝 +x，转向前方(-z)再内倾——2.5D 挤出模型靠侧影认形，斜持让轮廓可读
      gun.rotation.z = -0.52 // 原模型在展示场景里斜摆（枪管上翘约30°），滚转校平
      gun.scale.setScalar(0.42)
      gun.traverse(o => {
        const mesh = o as THREE.Mesh
        if (!mesh.isMesh) return
        for (const mm of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
          const std = mm as THREE.MeshStandardMaterial
          if (std.emissive) std.emissive.set(0x10121a) // 夜景里近黑枪身提一点轮廓光
        }
      })
      gunGrp.add(gun)
    })

    // 射击
    const ray = new THREE.Raycaster()
    const muzzle = new THREE.PointLight(0xffcc88, 0, 8)
    muzzle.position.set(0.3, -0.12, -1.15); camera.add(muzzle); scene.add(camera)
    const shoot = () => {
      if (endedRef.current) return
      if (document.pointerLockElement !== renderer.domElement && !fallbackRef.current) return
      sfx.shot()
      muzzle.intensity = 30
      gunKick = 1
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

      // 生成靶子：随时间加速；二段高潮（SURGE_AT 起）平民大量混入，逼玩家看清再开枪
      if (started) {
        if (elapsed > SURGE_AT && !surged) { surged = true; sfx.heartbeat() }
        spawnAcc += dt
        const interval = Math.max(520, 1150 - elapsed * 30)
        if (spawnAcc > interval && targets.filter(t => !t.dead).length < 6) {
          spawnAcc = 0
          mkTarget(Math.random() < (elapsed > SURGE_AT ? 0.48 : 0.28))
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
      // 枪的后座回弹：击发瞬间后撤上跳，~130ms 归位
      gunGrp.position.z = -0.58 + gunKick * 0.07
      gunGrp.rotation.x = gunKick * 0.12
      gunKick = Math.max(0, gunKick - dt * 0.008)

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
      clearTimeout(demoTimer)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mousedown', shoot)
      document.removeEventListener('pointerlockchange', onLockChange)
      document.removeEventListener('pointerlockerror', onLockError)
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
      {/* 二段高潮警告：SURGE_AT(11s) 起平民混入（timeLeft 20→9 为触发点，横幅显示约 5s） */}
      {locked && !over && timeLeft <= DURATION - SURGE_AT && timeLeft > DURATION - SURGE_AT - 5 && (
        <div className="surge-banner">人 群 涌 入 靶 区 —— 看 清 再 开 枪</div>
      )}
      {!locked && !fallback && !over && (
        <div className="game-overlay-msg" style={{ pointerEvents: 'none' }}>
          <div className="big">守 夜</div>
          <div className="game-hint">点击画面锁定视角 · 红色标靶射击（打头×2）· 白色平民勿伤</div>
          {/* 兜底出口：视角锁定不可用/不想玩时不至于卡死整条线（QA D-02） */}
          <button
            className="skip-game" data-testid="skip-fps" style={{ pointerEvents: 'auto' }}
            onClick={e => { e.stopPropagation(); sfx.click(); finishGame(0, '完成了一夜坚守', 'B') }}
          >
            跳 过 考 核 ▸
          </button>
        </div>
      )}
      {over && <RankSplash rank={over} title="考 核 结 束" sub={`得分 ${score}`} />}
    </div>
  )
}
