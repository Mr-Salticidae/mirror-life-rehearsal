import { useEffect, useRef, useState } from 'react'
import { useGame } from '../store'
import { sfx } from '../lib/audio'

// 序幕：按住镜面 1.2s"擦亮"预演（松手即停，蒙尘感随进度褪去）
export default function Prologue() {
  const enterChapter = useGame(s => s.enterChapter)
  const [pct, setPct] = useState(0)
  const [lit, setLit] = useState(false)
  const ref = useRef<{ raf: number; t0: number }>({ raf: 0, t0: 0 })

  const start = () => {
    if (lit) return
    sfx.spray()
    ref.current.t0 = performance.now() - pct * 1200 // 从当前进度继续
    const step = () => {
      const p = Math.min(1, (performance.now() - ref.current.t0) / 1200)
      setPct(p)
      if (p >= 1) { ignite(); return }
      ref.current.raf = requestAnimationFrame(step)
    }
    ref.current.raf = requestAnimationFrame(step)
  }
  // 松手时按实际按住时长判定（rAF 只做视觉，判定不依赖它）
  const stop = () => {
    cancelAnimationFrame(ref.current.raf)
    if (!lit && ref.current.t0 && performance.now() - ref.current.t0 >= 1200) ignite()
  }
  useEffect(() => () => cancelAnimationFrame(ref.current.raf), [])

  const ignite = () => {
    cancelAnimationFrame(ref.current.raf)
    setLit(true)
    sfx.ignite()
    setTimeout(() => enterChapter(0), 2200)
  }

  return (
    <div className="prologue fade-in">
      <div className="words">
        如果人生可以预演一次<br />
        你会走哪一条路？
      </div>
      <div
        className={`mirror ${lit ? 'lit' : ''}`} data-testid="mirror"
        style={{ filter: lit ? undefined : `brightness(${0.75 + pct * 0.6}) blur(${(1 - pct) * 1.2}px)` }}
        onPointerDown={start} onPointerUp={stop} onPointerLeave={stop}
      />
      <div className="hint">
        {lit ? '预演开始' : pct > 0 ? '别 松 手 ——' : '按 住 镜 面 · 擦 亮 预 演'}
      </div>
    </div>
  )
}
