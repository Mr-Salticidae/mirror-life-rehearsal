import { useEffect, useState } from 'react'
import { useGame } from '../store'
import { CAREER_INFO } from '../story'
import { useStill } from './useStill'
import ParallaxStill from './ParallaxStill'
import { sfx } from '../lib/audio'

export default function CareerIntro() {
  const career = useGame(s => s.ending)!
  const info = CAREER_INFO[career]
  const still = useStill(info.introStill, info.palette, `职业前奏·${info.name}`)
  const setPhase = useGame(s => s.setPhase)
  const [lineIdx, setLineIdx] = useState(0)

  useEffect(() => {
    if (lineIdx >= info.introLines.length - 1) return
    const t = setTimeout(() => setLineIdx(v => v + 1), 2600)
    return () => clearTimeout(t)
  }, [lineIdx, info.introLines.length])

  return (
    <div className="scene scene-fade" data-testid="career-intro">
      <ParallaxStill url={still} />
      <div className="light-sweep" aria-hidden />
      <div className="career-intro-copy">
        <div className="career-name">{info.name} · {info.title}</div>
        <div className="subtitle" style={{ fontSize: 'clamp(15px,1.6vw,22px)' }}>
          {info.introLines[lineIdx]}
        </div>
        <div className="game-hint">{info.gameHint}</div>
        <button className="go-btn" data-testid="enter-game"
                onClick={() => { sfx.confirm(); setPhase('game') }}>
          进 入 人 生
        </button>
      </div>
    </div>
  )
}
