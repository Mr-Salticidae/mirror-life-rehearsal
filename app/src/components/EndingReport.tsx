import { useEffect, useMemo, useRef, useState } from 'react'
import { useGame } from '../store'
import { CAREER_INFO, Career, Stat, MAX_REACH } from '../story'
import { generateReport, Report } from '../lib/ai'
import { computeTitle } from '../lib/titles'
import { pushHall } from '../lib/hall'
import FlowChart from './FlowChart'
import { useStill } from './useStill'
import { sfx } from '../lib/audio'

// GPTI 式 4 轴（基准：content/五结局扩容计划_db.md 附录 C/D）
interface Axis { name: string; l: string; r: string; letters: [string, string]; pct: number }
function computeAxes(s: Record<Stat, number>): { axes: Axis[]; typeCode: string } {
  const defs: Array<Omit<Axis, 'pct'> & { L: number; R: number }> = [
    { name: '核心驱动', l: '守', r: '创', letters: ['G', 'C'], L: s.guard, R: s.create + s.swift + s.rhythm + s.far },
    { name: '目光所向', l: '远', r: '近', letters: ['F', 'N'], L: s.swift + s.far, R: s.guard + s.create + s.rhythm },
    { name: '与世界的距离', l: '群', r: '独', letters: ['T', 'S'], L: s.guard + s.rhythm, R: s.create + s.swift + s.far },
    { name: '生命节奏', l: '疾', r: '缓', letters: ['V', 'R'], L: s.swift + s.rhythm, R: s.guard + s.create + s.far },
  ]
  const axes = defs.map(d => ({
    name: d.name, l: d.l, r: d.r, letters: d.letters,
    pct: d.L + d.R > 0 ? Math.round((d.L / (d.L + d.R)) * 100) : 50,
  }))
  const typeCode = axes.map(a => (a.pct >= 50 ? a.letters[0] : a.letters[1])).join('')
  return { axes, typeCode }
}

export default function EndingReport() {
  const g = useGame()
  const ending = g.ending!
  const info = CAREER_INFO[ending]
  const endStill = useStill(info.endStill, info.palette, `结局·${info.name}`)
  const [report, setReport] = useState<Report | null>(null)
  const [cardUrl, setCardUrl] = useState<string | null>(null)
  const [showCard, setShowCard] = useState(false)
  const [saved, setSaved] = useState(false)
  const requested = useRef(false)

  const title = useMemo(
    () => computeTitle(ending, g.gameRank, { regret: g.regret, overridden: g.overridden }),
    [ending, g.gameRank, g.regret, g.overridden],
  )

  // 4 轴与类型代码；无叙事数据（运维直达）时回退本命代码
  const { axes, typeCode } = useMemo(() => {
    const r = computeAxes(g.stats)
    const empty = Object.values(g.stats).every(v => v === 0)
    return empty ? { axes: r.axes, typeCode: info.typeCode } : r
  }, [g.stats, info.typeCode])

  // 镜子没给你的人生：归一化第 2/3 高的维度对应职业
  const altLives = useMemo(() => {
    const order: [Stat, Career][] = [
      ['guard', 'soldier'], ['create', 'painter'], ['swift', 'racer'],
      ['rhythm', 'musician'], ['far', 'astronaut'],
    ]
    return order
      .filter(([, c]) => c !== ending)
      .map(([st, c]) => ({ c, score: g.stats[st] / Math.sqrt(MAX_REACH[st]) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map(({ c }) => ({ name: CAREER_INFO[c].name, slogan: CAREER_INFO[c].slogan }))
  }, [g.stats, ending])

  useEffect(() => {
    if (requested.current) return
    requested.current = true
    sfx.confirm()
    generateReport({
      ending, overridden: g.overridden, regret: g.regret, timeouts: g.timeouts,
      path: g.path, gameScore: g.gameScore, gameDetail: g.gameDetail,
    }).then(r => {
      setReport(r)
      pushHall({ title, career: info.name, rank: g.gameRank ?? '—', score: g.gameScore })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 分享卡预合成（blob URL，点击时同步下载）
  const composeCard = (rep: Report): Promise<string> => new Promise(resolve => {
    const W = 1080, H = 1440
    const cv = document.createElement('canvas')
    cv.width = W; cv.height = H
    const ctx = cv.getContext('2d')!

    const finish = () => {
      const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.85)
      vg.addColorStop(0, 'transparent'); vg.addColorStop(1, 'rgba(0,0,0,.78)')
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, 0, W, H)

      ctx.textAlign = 'center'
      ctx.fillStyle = '#c9a86a'
      ctx.font = '26px serif'
      ctx.fillText('镜 像 自 我 · 人 生 预 演', W / 2, 118)
      ctx.fillStyle = '#8fa8c8'
      ctx.font = 'bold 30px monospace'
      ctx.fillText(`TYPE ${typeCode}`, W / 2, 172)
      ctx.fillStyle = '#f4efe4'
      ctx.font = 'bold 92px serif'
      ctx.fillText(info.name, W / 2, 300)
      ctx.fillStyle = '#d8b878'
      ctx.font = '40px serif'
      ctx.fillText(`「${title}」`, W / 2, 390)
      ctx.fillStyle = '#cfc9bb'
      ctx.font = '26px serif'
      ctx.fillText(info.slogan, W / 2, 446)

      // 双层金框
      ctx.strokeStyle = 'rgba(216,184,120,.7)'
      ctx.lineWidth = 3
      ctx.strokeRect(36, 36, W - 72, H - 72)
      ctx.lineWidth = 1
      ctx.strokeRect(50, 50, W - 100, H - 100)

      // 评级印章
      if (g.gameRank) {
        ctx.save()
        ctx.translate(W - 165, 210)
        ctx.rotate(-0.12)
        ctx.strokeStyle = g.gameRank === 'S' ? '#ffd86a' : g.gameRank === 'A' ? '#8fd8ff' : '#b8c0cc'
        ctx.fillStyle = ctx.strokeStyle
        ctx.lineWidth = 4
        ctx.beginPath(); ctx.arc(0, 0, 58, 0, Math.PI * 2); ctx.stroke()
        ctx.lineWidth = 1.5
        ctx.beginPath(); ctx.arc(0, 0, 48, 0, Math.PI * 2); ctx.stroke()
        ctx.font = 'bold 64px serif'
        ctx.textAlign = 'center'
        ctx.fillText(g.gameRank, 0, 24)
        ctx.restore()
        ctx.textAlign = 'center'
      }

      // 4 轴微缩条（横排）
      const barW = (W - 260) / 4, barY = 1210
      axes.forEach((a, i) => {
        const x = 130 + i * barW + 12
        const w = barW - 24
        ctx.fillStyle = 'rgba(255,255,255,.15)'
        ctx.fillRect(x, barY, w, 8)
        ctx.fillStyle = '#d8b878'
        ctx.fillRect(x, barY, w * a.pct / 100, 8)
        ctx.fillStyle = '#b8ac90'
        ctx.font = '20px serif'
        ctx.fillText(`${a.l} ${a.pct}%`, x + w / 2, barY + 34)
      })

      ctx.fillStyle = '#ece0c4'
      ctx.font = 'italic 32px serif'
      wrapText(ctx, `—— ${rep.finalWord}`, W / 2, 1100, W * 0.7, 52)

      ctx.fillStyle = 'rgba(255,255,255,.4)'
      ctx.font = '22px sans-serif'
      ctx.fillText('POWERED BY RTX LOCAL AI · GENJI @ BILIBILI WORLD', W / 2, H - 68)

      cv.toBlob(b => resolve(URL.createObjectURL(b!)), 'image/jpeg', 0.9)
    }

    const src = ending === 'painter' && g.graffitiData ? g.graffitiData : endStill
    const img = new Image()
    img.onload = () => {
      const s = Math.max(W / img.width, H / img.height)
      ctx.drawImage(img, (W - img.width * s) / 2, (H - img.height * s) / 2, img.width * s, img.height * s)
      finish()
    }
    img.onerror = () => { ctx.fillStyle = '#0a0e18'; ctx.fillRect(0, 0, W, H); finish() }
    img.src = src
  })

  useEffect(() => {
    if (!report) return
    let alive = true
    composeCard(report).then(url => { if (alive) setCardUrl(url); else URL.revokeObjectURL(url) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report])
  useEffect(() => () => { if (cardUrl) URL.revokeObjectURL(cardUrl) }, [cardUrl])

  const exportCard = () => {
    if (!cardUrl) return
    sfx.click()
    const a = document.createElement('a')
    a.download = `人生预演_${info.name}_${title}.jpg`
    a.href = cardUrl
    document.body.appendChild(a)
    a.click()
    a.remove()
    setShowCard(true)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const bg = ending === 'painter' && g.graffitiData ? g.graffitiData : endStill

  return (
    <div className="report" data-testid="report">
      <div className="scene-still" style={{
        backgroundImage: `url(${bg})`, opacity: 0.28, filter: 'saturate(.8)',
      }} />
      <div className="report-card">
        <div className="ai-tag">{report ? (report.fromAI ? 'RTX LOCAL AI' : 'OFFLINE MODE') : 'RTX LOCAL AI'}</div>
        <div className="rk">人生预演报告 · TYPE <span data-testid="type-code">{typeCode}</span></div>
        <h2>{info.name}的一生</h2>
        <div className="slogan">{info.slogan}</div>
        {report ? (
          <>
            <div className="honor" data-testid="honor">
              「{title}」{g.gameRank && <> · RANK {g.gameRank}</>}
            </div>
            {report.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
            <p className="final-word">{report.finalWord}</p>
          </>
        ) : (
          <div className="report-loading">本地 AI 正在回放你的一生……</div>
        )}
      </div>
      <div className="report-side">
        <FlowChart mode="final" />
        <div className="axes-grid" data-testid="axes">
          {axes.map(a => (
            <div className="axis-card" key={a.name}>
              <div className="ax-name">{a.name}</div>
              <div className="ax-ends"><span>{a.l}</span><span>{a.r}</span></div>
              <div className="ax-bar"><div className="ax-fill" style={{ width: `${a.pct}%` }} /></div>
              <div className="ax-pct">{a.pct}% · {100 - a.pct}%</div>
            </div>
          ))}
        </div>
        {altLives.length > 0 && (
          <div className="alt-lives" data-testid="alt-lives">
            <div className="al-title">镜子没给你的人生</div>
            {altLives.map(a => (
              <div className="al-item" key={a.name}><b>{a.name}</b> —— {a.slogan}</div>
            ))}
          </div>
        )}
        <div className="report-actions">
          <button className="primary" data-testid="save-card" onClick={exportCard} disabled={!cardUrl}>
            {saved ? '已保存 ✓' : cardUrl ? '保存分享卡' : '生成中…'}
          </button>
          <button data-testid="restart" onClick={() => { sfx.whoosh(); useGame.getState().toAttract() }}>
            重新预演
          </button>
        </div>
      </div>

      {showCard && cardUrl && (
        <div className="share-overlay" data-testid="share-overlay" onClick={() => setShowCard(false)}>
          <img src={cardUrl} alt="人生预演分享卡" />
          <div className="share-tip">已开始下载 · 也可右键图片另存 · 点击任意处关闭</div>
        </div>
      )}
    </div>
  )
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number) {
  let line = '', yy = y
  for (const ch of text) {
    if (ctx.measureText(line + ch).width > maxW) {
      ctx.fillText(line, x, yy); line = ch; yy += lineH
    } else line += ch
  }
  if (line) ctx.fillText(line, x, yy)
}
