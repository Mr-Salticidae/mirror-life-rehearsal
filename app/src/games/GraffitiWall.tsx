import { useEffect, useRef, useState } from 'react'
import { useGame, Rank } from '../store'
import { rankOf } from '../lib/titles'
import RankSplash from '../components/RankSplash'
import { placeholderStill, stillUrl } from '../lib/placeholder'
import { sfx } from '../lib/audio'

// 画家《一面墙》：喷漆创作，20s（展会节奏，主导定；可提前完成）
// 作品导出 dataURL，合成进结局剧照
const DURATION = 20
const COLORS = ['#ff4d4d', '#ffb84d', '#ffe84d', '#5ce87a', '#4dc4ff', '#b06aff', '#ff6ad5', '#f5f0e8', '#181818']
const SIZES = [14, 26, 44]

export default function GraffitiWall() {
  const wallRef = useRef<HTMLCanvasElement>(null)
  const paintRef = useRef<HTMLCanvasElement>(null)
  const finishGame = useGame(s => s.finishGame)
  const setGraffiti = useGame(s => s.setGraffiti)
  const [color, setColor] = useState(COLORS[0])
  const [size, setSize] = useState(1)
  const [timeLeft, setTimeLeft] = useState(DURATION)
  const [strokes, setStrokes] = useState(0)
  const [over, setOver] = useState<{ rank: Rank; cov: number } | null>(null)
  const doneRef = useRef(false)
  const colorRef = useRef(color); colorRef.current = color
  const sizeRef = useRef(size); sizeRef.current = size
  const strokesRef = useRef(strokes); strokesRef.current = strokes // 倒计时超时结算走旧闭包，用 ref 取实时笔数

  // 背景墙面
  useEffect(() => {
    const cv = wallRef.current!
    cv.width = innerWidth; cv.height = innerHeight
    const ctx = cv.getContext('2d')!
    const draw = (img?: HTMLImageElement) => {
      if (img) {
        // cover 绘制
        const s = Math.max(cv.width / img.width, cv.height / img.height)
        const w = img.width * s, h = img.height * s
        ctx.drawImage(img, (cv.width - w) / 2, (cv.height - h) / 2, w, h)
      } else {
        // 程序化砖墙
        const g = ctx.createLinearGradient(0, 0, 0, cv.height)
        g.addColorStop(0, '#2e2a28')
        g.addColorStop(1, '#181412')
        ctx.fillStyle = g
        ctx.fillRect(0, 0, cv.width, cv.height)
        ctx.strokeStyle = '#00000055'
        ctx.lineWidth = 3
        const bh = 46, bw = 110
        for (let y = 0; y < cv.height; y += bh) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cv.width, y); ctx.stroke()
          const off = (y / bh) % 2 ? bw / 2 : 0
          for (let x = off; x < cv.width; x += bw) {
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + bh); ctx.stroke()
          }
        }
        // 街灯光斑
        const rg = ctx.createRadialGradient(cv.width * 0.5, cv.height * 0.25, 0, cv.width * 0.5, cv.height * 0.35, cv.width * 0.55)
        rg.addColorStop(0, '#f0c88033'); rg.addColorStop(1, 'transparent')
        ctx.fillStyle = rg
        ctx.fillRect(0, 0, cv.width, cv.height)
        // 暗角
        const vg = ctx.createRadialGradient(cv.width / 2, cv.height / 2, cv.height * 0.3, cv.width / 2, cv.height / 2, cv.height)
        vg.addColorStop(0, 'transparent'); vg.addColorStop(1, '#000000cc')
        ctx.fillStyle = vg
        ctx.fillRect(0, 0, cv.width, cv.height)
      }
    }
    const img = new Image()
    img.onload = () => draw(img)
    img.onerror = () => draw()
    img.src = stillUrl('wall')
    void placeholderStill
  }, [])

  // 喷漆
  useEffect(() => {
    const cv = paintRef.current!
    cv.width = innerWidth; cv.height = innerHeight
    const ctx = cv.getContext('2d')!
    let painting = false
    let sprayTimer = 0

    const spray = (x: number, y: number) => {
      const r = SIZES[sizeRef.current]
      ctx.fillStyle = colorRef.current
      for (let i = 0; i < 34; i++) {
        const a = Math.random() * Math.PI * 2
        const d = Math.random() ** 0.5 * r
        const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d
        const dot = 0.6 + Math.random() * 1.6
        ctx.globalAlpha = 0.25 + Math.random() * 0.4
        ctx.beginPath(); ctx.arc(px, py, dot, 0, Math.PI * 2); ctx.fill()
      }
      // 偶发滴漏
      if (Math.random() < 0.05) {
        ctx.globalAlpha = 0.5
        ctx.fillRect(x + (Math.random() - 0.5) * r, y, 1.5, 10 + Math.random() * 30)
      }
      ctx.globalAlpha = 1
    }

    const pos = (e: PointerEvent) => ({ x: e.clientX, y: e.clientY })
    const down = (e: PointerEvent) => {
      if (doneRef.current) return
      const el = e.target as HTMLElement | null
      if (el?.closest?.('.graffiti-tools')) return
      painting = true
      setStrokes(v => v + 1)
      spray(pos(e).x, pos(e).y)
      sprayTimer = window.setInterval(() => sfx.spray(), 180)
    }
    const move = (e: PointerEvent) => { if (painting) spray(pos(e).x, pos(e).y) }
    const up = () => { painting = false; clearInterval(sprayTimer) }
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      clearInterval(sprayTimer)
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [])

  // 倒计时
  useEffect(() => {
    const t0 = performance.now()
    const iv = setInterval(() => {
      const left = Math.max(0, DURATION - (performance.now() - t0) / 1000)
      setTimeLeft(Math.ceil(left))
      if (left <= 0) done()
    }, 250)
    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const done = () => {
    if (doneRef.current) return
    doneRef.current = true
    // 覆盖率：采样喷漆层 alpha
    const pcv = paintRef.current!
    const pctx = pcv.getContext('2d')!
    const data = pctx.getImageData(0, 0, pcv.width, pcv.height).data
    let painted = 0, total = 0
    for (let i = 3; i < data.length; i += 4 * 16) { total++; if (data[i] > 24) painted++ }
    const cov = Math.round((painted / Math.max(1, total)) * 100)
    // 合成：墙 + 画作 → 分享/结局用
    const out = document.createElement('canvas')
    out.width = innerWidth; out.height = innerHeight
    const ctx = out.getContext('2d')!
    ctx.drawImage(wallRef.current!, 0, 0)
    ctx.drawImage(paintRef.current!, 0, 0)
    setGraffiti(out.toDataURL('image/jpeg', 0.85))
    // 亮灯演出 + 评级
    const rank = rankOf('graffiti', cov)
    setOver({ rank, cov })
    sfx.confirm()
    setTimeout(() => finishGame(cov,
      `占领了这面墙的 ${cov}%，一共 ${strokesRef.current} 笔`, rank), 3000)
  }

  return (
    <div style={{ position: 'absolute', inset: 0, cursor: 'crosshair' }}>
      {/* 完成时"城市亮灯"：墙面整体提亮 */}
      <canvas ref={wallRef} style={{ position: 'absolute', inset: 0,
        filter: over ? 'brightness(1.5) saturate(1.15)' : undefined, transition: 'filter 1.4s ease' }} />
      <canvas ref={paintRef} style={{ position: 'absolute', inset: 0,
        filter: over ? 'brightness(1.25)' : undefined, transition: 'filter 1.4s ease' }} />
      <div className="game-hud">
        <span>一 面 墙</span>
        <span>剩余 <b>{timeLeft}s</b></span>
      </div>
      <div className="graffiti-tools">
        {COLORS.map(c => (
          <button key={c} className={`paint-dot ${c === color ? 'on' : ''}`}
                  style={{ background: c, color: c }}
                  onClick={() => { setColor(c); sfx.click() }} />
        ))}
        <div className="brush-size">
          {SIZES.map((s, i) => (
            <button key={s} className={i === size ? 'on' : ''}
                    style={{ width: 30 + i * 8, height: 30 + i * 8 }}
                    onClick={() => { setSize(i); sfx.click() }}>●</button>
          ))}
        </div>
        <button className="done-btn" data-testid="graffiti-done" onClick={done}>完 成</button>
      </div>
      {over && <RankSplash rank={over.rank} title="天 亮 了" sub={`这面墙的 ${over.cov}% 属于你`} />}
    </div>
  )
}
