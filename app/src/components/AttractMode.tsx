import { useEffect, useMemo, useRef, useState } from 'react'
import { useGame, Gender } from '../store'
import { todayHall } from '../lib/hall'
import Dust from './Dust'
import { sfx, startBgm } from '../lib/audio'

// 性别入口图标：用户上传的男/女图标（仅图标，按钮无文字）。源文件 public/icons/{male,female}.png
// 图标缺失/加载失败时回退符号，不能出现破图（这是全站唯一无占位兜底的资产位）
const ICON_BASE = import.meta.env.BASE_URL
function GenderIcon({ file, fallback }: { file: string; fallback: string }) {
  const [ok, setOk] = useState(true)
  return ok
    ? <img className="gender-icon" src={`${ICON_BASE}icons/${file}`} alt="" aria-hidden="true" onError={() => setOk(false)} />
    : <span className="gender-icon" aria-hidden="true" style={{ fontSize: '2.2em', lineHeight: 1 }}>{fallback}</span>
}
function MaleIcon() { return <GenderIcon file="male.png" fallback="♂" /> }
function FemaleIcon() { return <GenderIcon file="female.png" fallback="♀" /> }
export default function AttractMode() {
  const start = useGame(s => s.start)
  const [gender, setGender] = useState<Gender | null>(null)

  // 键盘起播要读最新性别，用 ref 避免空依赖 effect 捕获到旧闭包
  const genderRef = useRef<Gender | null>(null)
  genderRef.current = gender

  const pick = (g: Gender) => { sfx.confirm(); setGender(g) }
  const go = () => {
    const g = genderRef.current
    if (!g) return            // 先选入口，才允许起播
    startBgm(); sfx.confirm(); start(g)
  }

  // 断网徽标（展台"拔网线时刻"）：离线时亮出——本地 AI 不依赖网络的现场证明
  const [offline, setOffline] = useState(!navigator.onLine)
  useEffect(() => {
    const on = () => setOffline(false), off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

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
      <Dust count={20} />
      <div className="kicker">INTERACTIVE FILM · 互动影游</div>
      <div className="logo">镜像自我</div>
      <div className="sub">人 生 预 演</div>

      {/* 入口：点男/女/其他后三钮隐退，"触碰开始预演"同位浮出 */}
      <div className="entry-slot">
        <div className={`gender-pick${gender ? ' gone' : ''}`} data-testid="gender-pick">
          <button className="gender-btn" data-testid="gender-male" aria-label="男" onClick={() => pick('male')}>
            <MaleIcon />
          </button>
          <button className="gender-btn" data-testid="gender-female" aria-label="女" onClick={() => pick('female')}>
            <FemaleIcon />
          </button>
        </div>
        {gender && (
          <button className="cta" data-testid="attract-start" onClick={go}>触 碰 开 始 预 演</button>
        )}
      </div>

      <div className="rtx">AN OFFLINE INTERACTIVE LIFE SIMULATION</div>
      {offline && (
        <div className="offline-badge" data-testid="offline-badge">
          ⬤ 已 离 线 · 本 地 A I 独 立 运 行 中
        </div>
      )}

      <div className="hall-wall" data-testid="hall-wall">
        <h4>今 日 人 生 墙</h4>
        {hall.length > 0 ? (
          <div className="hall-list" style={scroll ? undefined : { animation: 'none' }}>
            {items.map((e, i) => (
              <div className="hall-item" key={i}>
                <span className="ht">{e.title}</span>
                <span className="hr">{e.career} · <b>{e.rank}</b></span>
              </div>
            ))}
          </div>
        ) : (
          <div className="hall-empty">虚位以待 ——<br />成为今天第一个预演人生的人</div>
        )}
      </div>
    </div>
  )
}
