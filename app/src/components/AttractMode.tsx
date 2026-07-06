import { useEffect, useMemo } from 'react'
import { useGame } from '../store'
import { todayHall } from '../lib/hall'
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

  // 今日人生墙：本机玩家战绩滚动（不足 4 条不滚，凑双份做无缝循环）
  const hall = useMemo(() => todayHall(), [])
  const scroll = hall.length >= 4
  const items = scroll ? [...hall, ...hall] : hall

  return (
    <div className="attract">
      <div className="kicker">INTERACTIVE FILM · 互动影游</div>
      <div className="logo">镜像自我</div>
      <div className="sub">人 生 预 演</div>
      <button className="cta" data-testid="attract-start" onClick={go}>触 碰 开 始 预 演</button>
      <div className="rtx">POWERED BY RTX LOCAL AI · GENJI @ BILIBILI WORLD</div>

      {hall.length > 0 && (
        <div className="hall-wall" data-testid="hall-wall">
          <h4>今 日 人 生 墙</h4>
          <div className="hall-list" style={scroll ? undefined : { animation: 'none' }}>
            {items.map((e, i) => (
              <div className="hall-item" key={i}>
                <span className="ht">{e.title}</span>
                <span className="hr">{e.career} · <b>{e.rank}</b></span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
