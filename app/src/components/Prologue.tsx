import { useState } from 'react'
import { useGame } from '../store'
import { sfx } from '../lib/audio'

export default function Prologue() {
  const enterChapter = useGame(s => s.enterChapter)
  const [lit, setLit] = useState(false)

  const ignite = () => {
    if (lit) return
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
      <div className={`mirror ${lit ? 'lit' : ''}`} data-testid="mirror" onClick={ignite} />
      <div className="hint">{lit ? '预演开始' : '触 碰 镜 面 · 点 亮 预 演'}</div>
    </div>
  )
}
