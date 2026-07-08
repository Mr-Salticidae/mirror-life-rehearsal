import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useGame, Rank } from '../store'
import { rankOf } from '../lib/titles'
import RankSplash from '../components/RankSplash'
import { sfx } from '../lib/audio'

// 宇航员《突围》：纵向飞行射击（STG）。飞船底部巡航 + 自动连射，
// 陨石/无人机/拦截机/精英/BOSS，拾取 P/S/H/B，3 格船体 + 受击无敌帧，
// 连击倍率、二段高潮「碎片风暴」、20s、对象池、圆形碰撞、程序化几何 + 复用 sfx。
// 视觉复用 Docking 的星空 / 地球程序化做法；陨石/拾取/爆炸叠加 flight 素材包贴图（载入前程序化兜底）。
const DURATION = 15
const SURGE_AT = 10      // 碎片风暴起点
const BOSS_AT = 14       // BOSS 刷出
const BASE = import.meta.env.BASE_URL

// 世界尺寸（玩家在 XY 平面，相机略俯视）
const HALF_W = 22, SPAWN_X = 20, SPAWN_Y = 22, DESPAWN_Y = -22, PLAYER_Y_HOME = -15

const rnd = (a: number, b: number) => a + Math.random() * (b - a)
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]

type EnemyKind = 'asteroid' | 'drone' | 'interceptor' | 'elite' | 'boss'
interface Enemy {
  grp: THREE.Group; kind: EnemyKind
  x: number; y: number; vx: number; vy: number; r: number
  hp: number; maxhp: number; score: number; mult: boolean   // mult=是否参与连击倍率（BOSS 不参与）
  t: number; spin: number; shoots: boolean; fireAcc: number; fireInterval: number
  weave: number; dead: boolean; dying: number
}
interface Bullet { mesh: THREE.Mesh; x: number; y: number; vx: number; vy: number; active: boolean }
interface EBullet { mesh: THREE.Mesh; x: number; y: number; vx: number; vy: number; active: boolean }
interface Pickup { obj: THREE.Object3D; kind: 'P' | 'S' | 'H' | 'B'; x: number; y: number; r: number; t: number }
interface Burst { spr: THREE.Sprite; x: number; y: number; life: number; max: number; active: boolean }

export default function AstroBlaster() {
  const mountRef = useRef<HTMLDivElement>(null)
  const finishGame = useGame(s => s.finishGame)
  const [hud, setHud] = useState({ score: 0, hull: 3, mult: 1, power: 1, bombs: 0 })
  const [timeLeft, setTimeLeft] = useState(DURATION)
  const [bossHp, setBossHp] = useState<number | null>(null)
  const [surge, setSurge] = useState(false)
  const [over, setOver] = useState<{ rank: Rank; died: boolean } | null>(null)

  useEffect(() => {
    const mount = mountRef.current!
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true })
    } catch {
      finishGame(0, '完成了一次突围', 'B')
      return
    }
    renderer.setSize(innerWidth, innerHeight)
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x03060f)
    scene.fog = new THREE.Fog(0x03060f, 40, 110)
    const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 600)
    camera.position.set(0, 4, 34)
    camera.lookAt(0, 0, 0)

    scene.add(new THREE.HemisphereLight(0x6a86bc, 0x0a0e18, 2.0))
    scene.add(new THREE.AmbientLight(0x2a3448, 1.2))
    const key = new THREE.DirectionalLight(0xfff0d8, 1.8); key.position.set(8, 18, 20); scene.add(key)

    // 星空（复用 Docking 球面点云做法；此处改为下落视差，营造"向前飞"）
    const starGeo = new THREE.BufferGeometry()
    const SN = 1500, sp = new Float32Array(SN * 3)
    for (let i = 0; i < SN; i++) {
      sp[i * 3] = rnd(-80, 80); sp[i * 3 + 1] = rnd(-26, 42); sp[i * 3 + 2] = rnd(-50, -4)
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3))
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xcdd8ee, size: 0.5, sizeAttenuation: true, transparent: true, opacity: 0.9 }))
    scene.add(stars)

    // 贴图（flight 素材包；载入前程序化兜底）
    const loader = new THREE.TextureLoader()
    const disposables: THREE.Texture[] = []
    const meteorTexs: THREE.Texture[] = []
    const expTexs: THREE.Texture[] = []
    const pickupTex: Record<'P' | 'S' | 'H' | 'B', THREE.Texture | null> = { P: null, S: null, H: null, B: null }
    const mkTex = (url: string, into: (t: THREE.Texture) => void) =>
      loader.load(url, t => { t.colorSpace = THREE.SRGBColorSpace; disposables.push(t); into(t) }, undefined, () => { /* 载入失败静默兜底 */ })
    for (let i = 1; i <= 10; i++) mkTex(`${BASE}sprites/flight/meteors/Meteor_${String(i).padStart(2, '0')}.png`, t => meteorTexs.push(t))
    mkTex(`${BASE}sprites/flight/pickups/p.png`, t => (pickupTex.P = t))
    mkTex(`${BASE}sprites/flight/pickups/s.png`, t => (pickupTex.S = t))
    mkTex(`${BASE}sprites/flight/pickups/h.png`, t => (pickupTex.H = t))
    mkTex(`${BASE}sprites/flight/pickups/b.png`, t => (pickupTex.B = t))
    mkTex(`${BASE}sprites/flight/fx/Explosion_01.png`, t => expTexs.push(t))
    mkTex(`${BASE}sprites/flight/fx/Explosion_02.png`, t => expTexs.push(t))

    // 玩家飞船（程序化：机身锥 + 双翼 + 尾喷 + 尾灯 + 护盾壳）
    const shipMat = new THREE.MeshStandardMaterial({ color: 0xdce8ff, roughness: 0.35, metalness: 0.6, emissive: 0x0a1830 })
    const ship = new THREE.Group()
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.8, 12), shipMat); body.position.y = 0.5; ship.add(body)
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x8fa6c8, roughness: 0.4, metalness: 0.7 })
    for (const sx of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 0.6), wingMat)
      w.position.set(sx * 0.85, -0.15, 0); w.rotation.z = sx * 0.18; ship.add(w)
    }
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 0.5, 10),
      new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.5, metalness: 0.8 })); nozzle.position.y = -0.7; ship.add(nozzle)
    const tail = new THREE.PointLight(0x66bbff, 6, 9); tail.position.set(0, -1.0, 0); ship.add(tail)
    const shieldMesh = new THREE.Mesh(new THREE.SphereGeometry(1.9, 20, 16),
      new THREE.MeshBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.0 })); ship.add(shieldMesh)
    ship.position.set(0, PLAYER_Y_HOME, 0); scene.add(ship)

    // 对象池：玩家弹 / 敌弹 / 爆炸
    const bulletGeo = new THREE.CylinderGeometry(0.13, 0.13, 1.2, 6)
    const bulletMat = new THREE.MeshBasicMaterial({ color: 0x7fe9ff })
    const BULLET_N = 48
    const bullets: Bullet[] = []
    for (let i = 0; i < BULLET_N; i++) {
      const m = new THREE.Mesh(bulletGeo, bulletMat); m.visible = false; scene.add(m)
      bullets.push({ mesh: m, x: 0, y: 0, vx: 0, vy: 0, active: false })
    }
    const ebulletGeo = new THREE.SphereGeometry(0.26, 8, 8)
    const ebulletMat = new THREE.MeshBasicMaterial({ color: 0xff5040 })
    const EBULLET_N = 80
    const ebullets: EBullet[] = []
    for (let i = 0; i < EBULLET_N; i++) {
      const m = new THREE.Mesh(ebulletGeo, ebulletMat); m.visible = false; scene.add(m)
      ebullets.push({ mesh: m, x: 0, y: 0, vx: 0, vy: 0, active: false })
    }
    const BURST_N = 14
    const bursts: Burst[] = []
    for (let i = 0; i < BURST_N; i++) {
      // 每个 burst 独立 material，避免并发爆炸的透明度/贴图互相覆盖
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }))
      spr.visible = false; scene.add(spr)
      bursts.push({ spr, x: 0, y: 0, life: 0, max: 0.5, active: false })
    }
    const flash = new THREE.PointLight(0xffcc88, 0, 14); scene.add(flash)
    const spawnBullet = (x: number, y: number, vx: number, vy: number) => {
      const b = bullets.find(bb => !bb.active); if (!b) return
      b.active = true; b.x = x; b.y = y; b.vx = vx; b.vy = vy
      b.mesh.visible = true; b.mesh.position.set(x, y, 0)
    }
    const spawnEBullet = (x: number, y: number, vx: number, vy: number) => {
      const b = ebullets.find(bb => !bb.active); if (!b) return
      b.active = true; b.x = x; b.y = y; b.vx = vx; b.vy = vy
      b.mesh.visible = true; b.mesh.position.set(x, y, 0)
    }
    const spawnBurst = (x: number, y: number) => {
      const bu = bursts.find(bb => !bb.active); if (!bu) return
      bu.active = true; bu.x = x; bu.y = y; bu.life = 0; bu.max = 0.45
      bu.spr.visible = true; bu.spr.position.set(x, y, 0.5)
      bu.spr.scale.setScalar(0.4)
      if (expTexs.length) (bu.spr.material as THREE.SpriteMaterial).map = expTexs[Math.floor(Math.random() * expTexs.length)]
      ;(bu.spr.material as THREE.SpriteMaterial).opacity = 1
      flash.position.set(x, y, 2); flash.intensity = 26
    }

    // 敌人/拾取容器
    const enemies: Enemy[] = []
    const pickups: Pickup[] = []

    const mkAsteroid = () => {
      const grp = new THREE.Group()
      let r = 1.5
      if (meteorTexs.length) {
        const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: pick(meteorTexs), transparent: true, depthWrite: false }))
        spr.scale.setScalar(3.4); grp.add(spr); r = 1.4
      } else {
        const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2, 0),
          new THREE.MeshStandardMaterial({ color: 0x8a7a66, roughness: 1, flatShading: true }))
        const pos = m.geometry.attributes.position as THREE.BufferAttribute
        for (let i = 0; i < pos.count; i++) { pos.setXYZ(i, pos.getX(i) * rnd(0.8, 1.2), pos.getY(i) * rnd(0.8, 1.2), pos.getZ(i) * rnd(0.8, 1.2)) }
        pos.needsUpdate = true; m.geometry.computeVertexNormals(); grp.add(m)
      }
      const x = rnd(-SPAWN_X, SPAWN_X)
      grp.position.set(x, SPAWN_Y + rnd(0, 6), 0); scene.add(grp)
      enemies.push({ grp, kind: 'asteroid', x, y: grp.position.y, vx: 0, vy: rnd(7, 12), r, hp: 1, maxhp: 1, score: 5, mult: true, t: 0, spin: rnd(-2, 2), shoots: false, fireAcc: 0, fireInterval: 0, weave: 0, dead: false, dying: 0 })
    }
    const mkShip = (kind: 'drone' | 'interceptor' | 'elite') => {
      const grp = new THREE.Group()
      let r = 0.9, hp = 1, score = 10, shoots = false, fi = 0, weave = 0
      if (kind === 'drone') {
        const bodym = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 0.7, 10),
          new THREE.MeshStandardMaterial({ color: 0xc04030, emissive: 0x4a1208, roughness: 0.5, metalness: 0.5 })); bodym.rotation.z = Math.PI / 2; grp.add(bodym)
        for (const sx of [-1, 1]) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), new THREE.MeshStandardMaterial({ color: 0x301018, emissive: 0xff4030 })); s.position.set(0, sx * 0.5, 0); grp.add(s) }
        r = 0.85; hp = 2; score = 10; shoots = true; fi = 1.5
      } else if (kind === 'interceptor') {
        const bodym = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 1.0),
          new THREE.MeshStandardMaterial({ color: 0x8a96aa, emissive: 0x202830, roughness: 0.4, metalness: 0.7 })); grp.add(bodym)
        for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.7), new THREE.MeshStandardMaterial({ color: 0x5a6478, metalness: 0.7 })); p.position.set(sx * 0.95, 0, 0); grp.add(p) }
        r = 1.1; hp = 3; score = 25; shoots = true; fi = 1.8
      } else {
        const bodym = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.6, 6),
          new THREE.MeshStandardMaterial({ color: 0xb06ad0, emissive: 0x3a1248, roughness: 0.3, metalness: 0.7 })); bodym.rotation.x = Math.PI; grp.add(bodym)
        for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 0.5), new THREE.MeshStandardMaterial({ color: 0x804aa0, emissive: 0x2a1040 })); w.position.set(sx * 0.7, -0.1, 0); grp.add(w) }
        r = 1.05; hp = 5; score = 50; shoots = true; fi = 1.3; weave = 1
      }
      grp.rotation.z = Math.PI   // 机头朝下
      const x = rnd(-SPAWN_X, SPAWN_X)
      grp.position.set(x, SPAWN_Y + rnd(0, 5), 0); scene.add(grp)
      const vy = kind === 'interceptor' ? rnd(4, 6) : rnd(6, 9)
      enemies.push({ grp, kind, x, y: grp.position.y, vx: 0, vy, r, hp, maxhp: hp, score, mult: true, t: Math.random() * 6, spin: 0, shoots, fireAcc: Math.random() * fi, fireInterval: fi, weave, dead: false, dying: 0 })
    }
    const mkBoss = () => {
      const grp = new THREE.Group()
      const hull = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.6, 1.5, 8),
        new THREE.MeshStandardMaterial({ color: 0x6a7088, emissive: 0x2a0a14, roughness: 0.4, metalness: 0.8 })); hull.rotation.z = Math.PI / 2; grp.add(hull)
      for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 1.6), new THREE.MeshStandardMaterial({ color: 0x4a5066, metalness: 0.8, roughness: 0.4 })); w.position.set(sx * 2.4, 0, 0); grp.add(w) }
      for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 10), new THREE.MeshStandardMaterial({ color: 0x300810, emissive: 0xff3020 })); e.position.set(sx * 1.4, -0.6, 0.8); grp.add(e) }
      grp.rotation.z = Math.PI
      grp.position.set(0, SPAWN_Y + 6, 0); scene.add(grp)
      const e: Enemy = { grp, kind: 'boss', x: 0, y: grp.position.y, vx: 0, vy: 4, r: 3.2, hp: 40, maxhp: 40, score: 300, mult: false, t: 0, spin: 0, shoots: true, fireAcc: 1.2, fireInterval: 1.0, weave: 0, dead: false, dying: 0 }
      enemies.push(e); bossRef.current = e; setBossHp(1)
    }

    const dropPickup = (x: number, y: number) => {
      const roll = Math.random()
      const kind: 'P' | 'S' | 'H' | 'B' = roll < 0.45 ? 'P' : roll < 0.66 ? 'H' : roll < 0.85 ? 'S' : 'B'
      const obj = new THREE.Object3D()
      const tex = pickupTex[kind]
      if (tex) {
        const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); spr.scale.setScalar(2.0); obj.add(spr)
      } else {
        const col = kind === 'P' ? 0xffcc44 : kind === 'S' ? 0x66ccff : kind === 'H' ? 0x66ff88 : 0xff66cc
        const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.7), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.6, roughness: 0.3 }))
        obj.add(m)
      }
      obj.position.set(x, y, 0); scene.add(obj)
      pickups.push({ obj, kind, x, y, r: 1.2, t: 0 })
    }

    // 状态
    const st = {
      score: 0, hull: 3, power: 1, bombs: 0, streak: 0, best: 0, mult: 1,
      invuln: 0, shield: 0, kills: 0, bossKilled: false, died: false, shake: 0,
      px: 0, py: PLAYER_Y_HOME, targetX: 0, targetY: PLAYER_Y_HOME, fireAcc: 0,
    }
    const bossRef: { current: Enemy | null } = { current: null }
    const keys = { left: false, right: false, up: false, down: false }
    const ptr = { active: false }
    let lastTap = 0

    const fireIntervalOf = () => [0, 0.14, 0.12, 0.10][st.power] ?? 0.10
    const recalcMult = () => { st.mult = Math.min(3, 1 + Math.floor(st.streak / 8)) }

    const damagePlayer = () => {
      if (st.invuln > 0 || st.shield > 0 || ended.current) return
      st.hull--; st.streak = 0; recalcMult(); st.invuln = 1.2; st.shake = 0.9; sfx.wrong()
      if (st.hull <= 0) { st.died = true; end(true) }
    }
    const detonate = () => {
      if (st.bombs <= 0 || ended.current) return
      st.bombs--; sfx.crash(); flash.intensity = 40; st.shake = 0.6
      for (const b of ebullets) { b.active = false; b.mesh.visible = false }
      for (const e of enemies) {
        if (e.dead) continue
        if (e.kind === 'boss') { e.hp -= 6; if (e.hp <= 0) killEnemy(e, true) }
        else { e.hp = 0; killEnemy(e, true) }
      }
    }
    const killEnemy = (e: Enemy, scored: boolean) => {
      if (e.dead) return
      e.dead = true; e.dying = 0.001
      spawnBurst(e.x, e.y)
      if (scored) {
        st.kills++
        if (e.mult) { st.streak++; st.best = Math.max(st.best, st.streak); recalcMult(); st.score += Math.round(e.score * st.mult) }
        else { st.score += e.score }
        if (e.kind === 'boss') { st.bossKilled = true; bossRef.current = null; setBossHp(null); sfx.ignite() }
        else if (Math.random() < (e.kind === 'elite' || e.kind === 'interceptor' ? 0.4 : 0.12)) dropPickup(e.x, e.y)
        sfx.crash()
      }
    }

    // 输入
    const onKey = (edown: KeyboardEvent) => {
      const k = edown.key.toLowerCase()
      if (k === 'arrowleft' || k === 'a') keys.left = true
      if (k === 'arrowright' || k === 'd') keys.right = true
      if (k === 'arrowup' || k === 'w') keys.up = true
      if (k === 'arrowdown' || k === 's') keys.down = true
      if (k === 'shift' || k === 'x') detonate()
    }
    const onKeyUp = (eup: KeyboardEvent) => {
      const k = eup.key.toLowerCase()
      if (k === 'arrowleft' || k === 'a') keys.left = false
      if (k === 'arrowright' || k === 'd') keys.right = false
      if (k === 'arrowup' || k === 'w') keys.up = false
      if (k === 'arrowdown' || k === 's') keys.down = false
    }
    const worldFromClient = (cx: number, cy: number) => {
      const tx = (cx / innerWidth - 0.5) * 2 * HALF_W
      const ty = -6 - (cy / innerHeight - 0.5) * 30
      return [Math.max(-HALF_W, Math.min(HALF_W, tx)), Math.max(-18, Math.min(-2, ty))] as const
    }
    const onPtrDown = (ev: PointerEvent) => {
      const now = ev.timeStamp
      if (now - lastTap < 300) detonate()
      lastTap = now
      ptr.active = true
      const [tx, ty] = worldFromClient(ev.clientX, ev.clientY); st.targetX = tx; st.targetY = ty
    }
    const onPtrMove = (ev: PointerEvent) => {
      if (!ptr.active) return
      const [tx, ty] = worldFromClient(ev.clientX, ev.clientY); st.targetX = tx; st.targetY = ty
    }
    const onPtrUp = () => { ptr.active = false }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('pointerdown', onPtrDown)
    window.addEventListener('pointermove', onPtrMove)
    window.addEventListener('pointerup', onPtrUp)
    window.addEventListener('pointercancel', onPtrUp)

    const ended = { current: false }
    const survived = { current: DURATION }
    const end = (died: boolean) => {
      if (ended.current) return
      ended.current = true
      st.score += Math.round(survived.current) * 2   // 存活秒数 × 2
      let rank = rankOf('flight', st.score)
      if (rank === 'S' && died) rank = 'A'            // S 要求全程无阵亡（hull 未归零）
      setHud({ score: st.score, hull: Math.max(0, st.hull), mult: st.mult, power: st.power, bombs: st.bombs })  // 让 RankSplash 显示含存活加成的终分
      setOver({ rank, died })
      sfx.confirm()
      const bossLine = st.bossKilled ? '（BOSS 已击沉）' : bossRef.current ? '（BOSS 仍在）' : ''
      setTimeout(() => finishGame(st.score,
        `击毁 ${st.kills} 个目标${bossLine}，最长连击 ×${st.best}，剩余船体 ${Math.max(0, st.hull)}`, rank), 3000)
    }

    let raf = 0, last = performance.now(), spawnAcc = 0, surged = false, bossSpawned = false
    const t0 = performance.now()
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const now = performance.now()
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const elapsed = (now - t0) / 1000
      const left = Math.max(0, DURATION - elapsed)
      survived.current = Math.min(DURATION, elapsed)
      setTimeLeft(Math.ceil(left))

      if (!ended.current) {
        // 二段高潮
        if (elapsed >= SURGE_AT && !surged) { surged = true; setSurge(true); sfx.heartbeat() }
        // BOSS 刷出
        if (elapsed >= BOSS_AT && !bossSpawned) { bossSpawned = true; mkBoss(); sfx.ignite() }
        // 生成
        spawnAcc += dt
        const interval = Math.max(0.38, 0.9 - elapsed * 0.038)
        const liveNorm = enemies.filter(e => !e.dead && e.kind !== 'boss').length
        if (spawnAcc > interval && liveNorm < 9 && elapsed < BOSS_AT - 0.5) {
          spawnAcc = 0
          const r = Math.random()
          if (elapsed < SURGE_AT) (r < 0.6 ? mkAsteroid() : mkShip('drone'))
          else if (r < 0.35) mkAsteroid()
          else if (r < 0.7) mkShip('drone')
          else if (r < 0.9) mkShip('interceptor')
          else mkShip('elite')
        }
        // 玩家移动
        let mvx = 0, mvy = 0
        if (keys.left) mvx -= 1; if (keys.right) mvx += 1
        if (keys.up) mvy += 1; if (keys.down) mvy -= 1
        if (!ptr.active) { st.targetX += mvx * 30 * dt; st.targetY += mvy * 22 * dt }
        st.targetX = Math.max(-HALF_W, Math.min(HALF_W, st.targetX))
        st.targetY = Math.max(-18, Math.min(-2, st.targetY))
        st.px += (st.targetX - st.px) * Math.min(1, dt * 11)
        st.py += (st.targetY - st.py) * Math.min(1, dt * 11)
        ship.position.set(st.px, st.py, 0)
        ship.rotation.z = (st.targetX - st.px) * -0.05
        // 护盾 / 无敌闪烁
        st.invuln = Math.max(0, st.invuln - dt)
        st.shield = Math.max(0, st.shield - dt)
        const shMat = shieldMesh.material as THREE.MeshBasicMaterial
        shMat.opacity = st.shield > 0 ? 0.18 + Math.sin(elapsed * 12) * 0.06 : 0
        ship.visible = st.invuln > 0 && st.shield <= 0 ? (Math.floor(elapsed * 18) % 2 === 0) : true
        // 自动射击
        st.fireAcc += dt
        const fi = fireIntervalOf()
        if (st.fireAcc >= fi) {
          st.fireAcc = 0; sfx.shot()
          const sx = st.px, sy = st.py + 0.9
          if (st.power <= 1) spawnBullet(sx, sy, 0, 44)
          else if (st.power === 2) { spawnBullet(sx, sy, 0, 44); spawnBullet(sx - 0.5, sy, -6, 43); spawnBullet(sx + 0.5, sy, 6, 43) }
          else { spawnBullet(sx, sy, 0, 44); spawnBullet(sx - 0.6, sy, -10, 42); spawnBullet(sx + 0.6, sy, 10, 42); spawnBullet(sx - 1.0, sy, -18, 40); spawnBullet(sx + 1.0, sy, 18, 40) }
        }
      }

      // 玩家弹移动 + 命中
      for (const b of bullets) {
        if (!b.active) continue
        b.y += b.vy * dt; b.x += b.vx * dt; b.mesh.position.set(b.x, b.y, 0)
        if (b.y > SPAWN_Y + 4) { b.active = false; b.mesh.visible = false; continue }
        for (const e of enemies) {
          if (e.dead) continue
          const dx = b.x - e.x, dy = b.y - e.y
          if (dx * dx + dy * dy < (e.r + 0.3) * (e.r + 0.3)) {
            b.active = false; b.mesh.visible = false
            e.hp--; sfx.hit()
            if (e.hp <= 0) killEnemy(e, true)
            break
          }
        }
      }
      // 敌人逻辑
      for (const e of enemies) {
        if (e.dead) {
          e.dying += dt
          e.grp.scale.multiplyScalar(0.8); e.grp.rotation.z += 0.2
          continue
        }
        e.t += dt
        if (e.kind === 'boss') {
          const ty = 16
          e.y += (ty - e.y) * Math.min(1, dt * 1.5)
          e.x = Math.sin(e.t * 0.55) * (SPAWN_X - 2)
          setBossHp(Math.max(0, e.hp / e.maxhp))
          e.fireAcc += dt
          if (e.fireAcc > e.fireInterval) {
            e.fireAcc = 0; const n = 5
            for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.32; spawnEBullet(e.x, e.y - 1.5, Math.cos(a) * 16, Math.sin(a) * 16) }
            sfx.shot()
          }
        } else {
          e.y -= e.vy * dt
          if (e.weave) e.x += Math.sin(e.t * 2.4) * 4 * dt
          if (e.kind === 'asteroid') e.grp.rotation.z += e.spin * dt
          if (e.shoots) {
            e.fireAcc += dt
            if (e.y < SPAWN_Y - 3 && e.fireAcc > e.fireInterval) {
              e.fireAcc = 0
              if (e.kind === 'interceptor') { for (const a of [-0.3, 0, 0.3]) { const ang = -Math.PI / 2 + a; spawnEBullet(e.x, e.y - 0.5, Math.cos(ang) * 14, Math.sin(ang) * 14) } }
              else if (e.kind === 'elite') { const dx = st.px - e.x, dy = st.py - e.y, d = Math.hypot(dx, dy) || 1; spawnEBullet(e.x, e.y - 0.5, dx / d * 16, dy / d * 16) }
              else spawnEBullet(e.x, e.y - 0.5, 0, -15)
              sfx.shot()
            }
          }
        }
        e.grp.position.set(e.x, e.y, 0)
        // 与玩家碰撞
        if (!ended.current) {
          const dx = e.x - st.px, dy = e.y - st.py
          if (dx * dx + dy * dy < (e.r + 0.9) * (e.r + 0.9)) {
            if (e.kind === 'boss') damagePlayer()
            else { damagePlayer(); e.hp = 0; killEnemy(e, false) }
          }
        }
        if (e.y < DESPAWN_Y && e.kind !== 'boss') {
          e.dead = true; e.dying = 0.001
          if (e.shoots && !ended.current) { st.streak = 0; recalcMult() }
        }
      }
      // 清理彻底消失的敌人
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i]
        if (e.dead && e.grp.scale.x < 0.05) { scene.remove(e.grp); enemies.splice(i, 1) }
      }
      // 敌弹
      for (const b of ebullets) {
        if (!b.active) continue
        b.x += b.vx * dt; b.y += b.vy * dt; b.mesh.position.set(b.x, b.y, 0)
        if (b.y < DESPAWN_Y || Math.abs(b.x) > HALF_W + 4) { b.active = false; b.mesh.visible = false; continue }
        if (!ended.current && st.invuln <= 0 && st.shield <= 0) {
          const dx = b.x - st.px, dy = b.y - st.py
          if (dx * dx + dy * dy < 1.1 * 1.1) { b.active = false; b.mesh.visible = false; damagePlayer() }
        }
      }
      // 拾取
      for (let i = pickups.length - 1; i >= 0; i--) {
        const p = pickups[i]; p.t += dt; p.y -= 6 * dt; p.obj.position.set(p.x, p.y, 0); p.obj.rotation.y += dt * 3
        const dx = p.x - st.px, dy = p.y - st.py
        if (dx * dx + dy * dy < (p.r + 0.9) * (p.r + 0.9)) {
          scene.remove(p.obj); pickups.splice(i, 1)
          if (ended.current) continue
          if (p.kind === 'P') { if (st.power < 3) st.power++; else st.score += 20; sfx.nitro() }
          else if (p.kind === 'H') { st.hull = Math.min(3, st.hull + 1); sfx.click() }
          else if (p.kind === 'S') { st.shield = 4; sfx.click() }
          else { st.bombs++; sfx.click() }
        } else if (p.y < DESPAWN_Y) { scene.remove(p.obj); pickups.splice(i, 1) }
      }
      // 爆炸演出
      for (const bu of bursts) {
        if (!bu.active) continue
        bu.life += dt
        const k = bu.life / bu.max
        if (k >= 1) { bu.active = false; bu.spr.visible = false; continue }
        bu.spr.scale.setScalar(0.4 + k * 4.5)
        ;(bu.spr.material as THREE.SpriteMaterial).opacity = 1 - k
      }
      flash.intensity = Math.max(0, flash.intensity - dt * 160)

      // 玩家尾灯呼吸
      tail.intensity = 5 + Math.sin(elapsed * 18) * 1.5

      // 星空下落视差
      const sp2 = stars.geometry.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < SN; i++) { let y = sp2.getY(i) - dt * 10; if (y < -26) y = 42; sp2.setY(i, y) }
      sp2.needsUpdate = true

      // 相机受击震动
      st.shake = Math.max(0, st.shake - dt * 3)
      camera.position.x = (Math.random() - 0.5) * st.shake
      camera.position.y = 4 + (Math.random() - 0.5) * st.shake
      camera.lookAt(0, 0, 0)

      if (!ended.current) setHud({ score: st.score, hull: Math.max(0, st.hull), mult: st.mult, power: st.power, bombs: st.bombs })
      if (left <= 0 && !ended.current) end(false)

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
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('pointerdown', onPtrDown)
      window.removeEventListener('pointermove', onPtrMove)
      window.removeEventListener('pointerup', onPtrUp)
      window.removeEventListener('pointercancel', onPtrUp)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      scene.traverse(o => {
        const m = o as THREE.Mesh
        if (m.geometry) m.geometry.dispose()
        if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach(mm => mm.dispose())
      })
      disposables.forEach(t => t.dispose())
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const hullPips = '◆'.repeat(hud.hull) + '◇'.repeat(3 - hud.hull)
  return (
    <div ref={mountRef} style={{ position: 'absolute', inset: 0 }}>
      <div className="game-hud">
        <span>得分 <b>{hud.score}</b></span>
        <span>船体 <b style={{ color: hud.hull <= 1 ? '#ff7a6a' : '#e8cf96' }}>{hullPips}</b></span>
        <span>火力 <b>P{hud.power}</b></span>
        <span>连击 <b>×{hud.mult}</b></span>
        <span>炸弹 <b>×{hud.bombs}</b></span>
        <span>剩余 <b>{timeLeft}s</b></span>
      </div>
      {bossHp !== null && !over && (
        <div style={{ position: 'absolute', top: '13vh', left: '50%', transform: 'translateX(-50%)', zIndex: 30,
          width: '46vw', maxWidth: 460, pointerEvents: 'none' }}>
          <div style={{ fontSize: 12, letterSpacing: '.4em', color: '#ff9a80', textAlign: 'center', marginBottom: 4 }}>中 型 敌 舰</div>
          <div style={{ height: 8, background: 'rgba(255,255,255,.12)', border: '1px solid #ffffff2a' }}>
            <div style={{ height: '100%', width: `${bossHp * 100}%`, background: 'linear-gradient(90deg,#ff5040,#ffaa55)', transition: 'width .12s linear' }} />
          </div>
        </div>
      )}
      {surge && !over && (
        <div className="surge-banner">碎 片 风 暴 —— 注 意 规 避</div>
      )}
      {timeLeft >= DURATION - 0.2 && !over && (
        <div className="game-overlay-msg" style={{ pointerEvents: 'none', background: 'rgba(0,0,0,.5)' }}>
          <div className="big">突 围</div>
          <div className="game-hint">← → 移动 · 自动射击 · 躲避陨石与弹幕 · 拾取 P 升级火力</div>
          <div className="game-hint" style={{ opacity: .7 }}>触屏拖动飞船 · 双击放炸弹（Shift / X）</div>
          <button
            className="skip-game" data-testid="skip-flight" style={{ pointerEvents: 'auto' }}
            onClick={e => { e.stopPropagation(); sfx.click(); finishGame(0, '完成了一次突围', 'B') }}
          >
            跳 过 突 围 ▸
          </button>
        </div>
      )}
      {over && <RankSplash rank={over.rank} title={over.died ? '阵 行 失 控' : '突 围'} sub={`得分 ${hud.score}`} />}
    </div>
  )
}
