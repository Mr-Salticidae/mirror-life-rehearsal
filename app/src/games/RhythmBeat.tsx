import { useEffect, useRef, useState } from 'react'
import { useGame, Rank } from '../store'
import { rankOf } from '../lib/titles'
import RankSplash from '../components/RankSplash'
import { sfx } from '../lib/audio'

// 音乐人《躁动》：4 轨下落节奏，D F J K 或点击轨道接拍，60s
// 命中 +1（连击 10/25/50 → ×2/×4/×8 倍率计入总分展示），评级按命中率；S 另需最大连击 ≥60
const DURATION = 60
const BPM = 112
const LANES = 4
const KEYS = ['d', 'f', 'j', 'k']
const HIT_WINDOW = 150   // ms
const LANE_COLOR = ['#c98bff', '#8fd8ff', '#ffd86a', '#ff8ac8']

interface Note { t: number; lane: number; hit: boolean; missed: boolean }

function buildChart(): Note[] {
  // 确定性谱面：主拍必有音，反拍 60% 概率，8 分连打点缀
  const beat = 60000 / BPM
  const notes: Note[] = []
  let seed = 20260706
  const rnd = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296 }
  for (let t = 2400; t < DURATION * 1000 - 1500; t += beat) {
    notes.push({ t, lane: Math.floor(rnd() * LANES), hit: false, missed: false })
    if (rnd() < 0.6) notes.push({ t: t + beat / 2, lane: Math.floor(rnd() * LANES), hit: false, missed: false })
    if (rnd() < 0.18) notes.push({ t: t + beat / 4, lane: Math.floor(rnd() * LANES), hit: false, missed: false })
  }
  return notes.sort((a, b) => a.t - b.t)
}

export default function RhythmBeat() {
  const cvRef = useRef<HTMLCanvasElement>(null)
  const finishGame = useGame(s => s.finishGame)
  const [combo, setCombo] = useState(0)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(DURATION)
  const [over, setOver] = useState<{ rank: Rank; rate: number } | null>(null)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const cv = cvRef.current!
    cv.width = innerWidth; cv.height = innerHeight
    const ctx = cv.getContext('2d')!
    const notes = buildChart()
    const st = { combo: 0, maxCombo: 0, hits: 0, score: 0, flash: [0, 0, 0, 0], pulse: 0, startAt: 0 }
    const bursts: { x: number; y: number; r: number; life: number }[] = [] // 全连爆发光环
    const ended = { current: false }

    // 音频：鼓组合成 + 前瞻调度
    const AC = new AudioContext()
    const drum = (type: 'kick' | 'snare' | 'hat', at: number) => {
      const t = at
      if (type === 'kick') {
        const o = AC.createOscillator(), g = AC.createGain()
        o.type = 'sine'
        o.frequency.setValueAtTime(150, t)
        o.frequency.exponentialRampToValueAtTime(45, t + 0.12)
        g.gain.setValueAtTime(0.5, t)
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.22)
        o.connect(g).connect(AC.destination); o.start(t); o.stop(t + 0.25)
      } else {
        const len = type === 'snare' ? 0.16 : 0.05
        const buf = AC.createBuffer(1, AC.sampleRate * len, AC.sampleRate)
        const d = buf.getChannelData(0)
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length)
        const src = AC.createBufferSource(); src.buffer = buf
        const f = AC.createBiquadFilter()
        f.type = type === 'snare' ? 'bandpass' : 'highpass'
        f.frequency.value = type === 'snare' ? 1800 : 8000
        const g = AC.createGain(); g.gain.setValueAtTime(type === 'snare' ? 0.32 : 0.14, t)
        g.gain.exponentialRampToValueAtTime(0.001, t + len)
        src.connect(f).connect(g).connect(AC.destination); src.start(t)
      }
    }
    let schedIdx = 0
    let schedTimer = 0
    const beat = 60000 / BPM
    const scheduleAhead = () => {
      if (!st.startAt || ended.current) return
      const now = performance.now() - st.startAt
      while (schedIdx * beat < now + 400) {
        const tMs = schedIdx * beat
        const at = AC.currentTime + (st.startAt + tMs - performance.now()) / 1000
        if (at > AC.currentTime - 0.05) {
          drum(schedIdx % 2 === 0 ? 'kick' : 'snare', Math.max(at, AC.currentTime))
          drum('hat', Math.max(at, AC.currentTime))
        }
        schedIdx++
      }
    }
    schedTimer = window.setInterval(scheduleAhead, 120)

    // 布局
    const laneW = Math.min(120, innerWidth * 0.085)
    const totalW = laneW * LANES
    const x0 = (innerWidth - totalW) / 2
    const judgeY = innerHeight * 0.78
    const SPEED = innerHeight * 0.55 / 1000 // px per ms（约 1s 从顶落到判定线附近）

    const begin = () => {
      if (st.startAt) return
      AC.resume()
      st.startAt = performance.now()
      setStarted(true)
    }

    const judge = (lane: number) => {
      if (ended.current) return
      // 首次按键/点轨道 = 开始（谱面从 2.4s 起，此刻不会有可判音符，只做启动不算失误）
      if (!st.startAt) { begin(); st.flash[lane] = 1; return }
      const now = performance.now() - st.startAt
      st.flash[lane] = 1
      let best: Note | null = null
      for (const n of notes) {
        if (n.hit || n.missed || n.lane !== lane) continue
        const d = Math.abs(n.t - now)
        if (d <= HIT_WINDOW && (!best || d < Math.abs(best.t - now))) best = n
      }
      if (best) {
        best.hit = true
        st.hits++
        st.combo++
        st.maxCombo = Math.max(st.maxCombo, st.combo)
        const mult = st.combo >= 50 ? 8 : st.combo >= 25 ? 4 : st.combo >= 10 ? 2 : 1
        st.score += mult
        st.pulse = 1
        // 二段高潮：升档瞬间全屏炸亮；×8 段位每次命中都放光环
        if (st.combo === 25 || st.combo === 50) {
          st.pulse = 2.6
          st.flash = [1, 1, 1, 1]
          sfx.nitro()
        }
        if (st.combo >= 50) {
          bursts.push({ x: x0 + lane * laneW + laneW / 2, y: judgeY, r: 12, life: 1 })
        }
        sfx.hit()
        setCombo(st.combo); setScore(st.score)
      } else {
        st.combo = 0
        setCombo(0)
        sfx.tick()
      }
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      const lane = KEYS.indexOf(e.key.toLowerCase())
      if (lane >= 0) judge(lane)
      else begin()
    }
    const onPointer = (e: PointerEvent) => {
      const lane = Math.floor((e.clientX - x0) / laneW)
      if (lane >= 0 && lane < LANES) judge(lane)
      else begin()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointer)

    let raf = 0
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const now = st.startAt ? performance.now() - st.startAt : 0
      const left = st.startAt ? Math.max(0, DURATION - now / 1000) : DURATION
      setTimeLeft(Math.ceil(left))

      // 漏拍判定
      for (const n of notes) {
        if (!n.hit && !n.missed && now - n.t > HIT_WINDOW) {
          n.missed = true
          if (st.combo > 0) { st.combo = 0; setCombo(0) }
        }
      }

      // 绘制
      st.pulse = Math.max(0, st.pulse - 0.06)
      ctx.fillStyle = `rgb(${14 + st.pulse * 12},${8 + st.pulse * 6},${22 + st.pulse * 16})`
      ctx.fillRect(0, 0, cv.width, cv.height)
      // 轨道
      for (let l = 0; l < LANES; l++) {
        const x = x0 + l * laneW
        ctx.fillStyle = `rgba(255,255,255,${0.03 + st.flash[l] * 0.1})`
        ctx.fillRect(x + 2, 0, laneW - 4, cv.height)
        st.flash[l] = Math.max(0, st.flash[l] - 0.08)
        // 键位提示
        ctx.fillStyle = 'rgba(255,255,255,.4)'
        ctx.font = '16px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(KEYS[l].toUpperCase(), x + laneW / 2, judgeY + 46)
      }
      // 判定线
      ctx.fillStyle = 'rgba(232,207,150,.85)'
      ctx.fillRect(x0 - 20, judgeY - 2, totalW + 40, 3)
      // 音符
      for (const n of notes) {
        if (n.hit) continue
        const y = judgeY - (n.t - now) * SPEED
        if (y < -30 || y > cv.height + 30) continue
        const x = x0 + n.lane * laneW
        ctx.fillStyle = n.missed ? 'rgba(120,120,130,.35)' : LANE_COLOR[n.lane]
        ctx.shadowColor = n.missed ? 'transparent' : LANE_COLOR[n.lane]
        ctx.shadowBlur = n.missed ? 0 : 14
        ctx.fillRect(x + 8, y - 9, laneW - 16, 18)
        ctx.shadowBlur = 0
      }
      // 全连爆发光环：×8 段位的每次命中在判定线扩散
      for (let bi = bursts.length - 1; bi >= 0; bi--) {
        const b = bursts[bi]
        b.r += 5.5; b.life -= 0.045
        if (b.life <= 0) { bursts.splice(bi, 1); continue }
        ctx.strokeStyle = `rgba(232,207,150,${b.life * 0.7})`
        ctx.lineWidth = 2.5
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke()
      }
      // 结束
      if (st.startAt && left <= 0 && !ended.current) {
        ended.current = true
        clearInterval(schedTimer)
        const total = notes.length
        const rate = Math.round((st.hits / total) * 100)
        let rank = rankOf('rhythm', rate)
        if (rank === 'S' && st.maxCombo < 60) rank = 'A' // S 双门槛：命中率 + 连击
        setOver({ rank, rate })
        sfx.confirm()
        setTimeout(() => finishGame(rate,
          `命中率 ${rate}% · 最大连击 ${st.maxCombo} · 总谱面 ${total} 拍`, rank), 3000)
      }
    }
    loop()

    const onResize = () => { cv.width = innerWidth; cv.height = innerHeight }
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(raf)
      clearInterval(schedTimer)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('resize', onResize)
      AC.close().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <canvas ref={cvRef} style={{ position: 'absolute', inset: 0 }} />
      <div className="game-hud">
        <span>得分 <b>{score}</b></span>
        <span>连击 <b>{combo}</b></span>
        <span>剩余 <b>{timeLeft}s</b></span>
      </div>
      {!started && !over && (
        <div className="game-overlay-msg" style={{ pointerEvents: 'none' }}>
          <div className="big">躁 动</div>
          <div className="game-hint">按 D F J K（或点击轨道）开始 · 音符落到金线时接拍</div>
        </div>
      )}
      {over && <RankSplash rank={over.rank} title="安 可" sub={`命中率 ${over.rate}%`} />}
    </div>
  )
}
