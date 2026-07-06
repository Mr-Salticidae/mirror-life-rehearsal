import { useEffect } from 'react'
import { useGame } from '../store'
import { sfx, startBgm } from '../lib/audio'

export default function AttractMode() {
  const start = useGame(s => s.start)
  const go = () => { startBgm(); sfx.confirm(); start() }

  useEffect(() => {
    const onKey = () => go()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="attract">
      <div className="kicker">INTERACTIVE FILM · 互动影游</div>
      <div className="logo">镜像自我</div>
      <div className="sub">人 生 预 演</div>
      <button className="cta" data-testid="attract-start" onClick={go}>触 碰 开 始 预 演</button>
      <div className="rtx">POWERED BY RTX LOCAL AI · GENJI @ BILIBILI WORLD</div>
    </div>
  )
}
