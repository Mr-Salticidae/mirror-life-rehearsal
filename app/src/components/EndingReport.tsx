import { useEffect, useMemo, useRef, useState } from 'react'
import { useGame, careerOf } from '../store'
import { CAREER_INFO, DRIFTER_INFO } from '../story'
import { generateReport, Report } from '../lib/ai'
import { computeTitle } from '../lib/titles'
import { pushHall } from '../lib/hall'
import FlowChart from './FlowChart'
import { useStill } from './useStill'
import { sfx } from '../lib/audio'

export default function EndingReport() {
  const g = useGame()
  const ending = g.ending!
  const career = careerOf(ending)
  const info = career ? CAREER_INFO[career] : null
  const endStillId = info ? info.endStill : DRIFTER_INFO.endStill
  const palette = info ? info.palette : DRIFTER_INFO.palette
  const endStill = useStill(endStillId, palette, `结局·${info?.name ?? DRIFTER_INFO.name}`)
  const [report, setReport] = useState<Report | null>(null)
  const [cardUrl, setCardUrl] = useState<string | null>(null) // 预合成的分享卡 blob URL
  const [showCard, setShowCard] = useState(false)
  const [saved, setSaved] = useState(false)
  const requested = useRef(false)

  const title = useMemo(
    () => computeTitle(ending, g.gameRank, { regret: g.regret, overridden: g.overridden }),
    [ending, g.gameRank, g.regret, g.overridden],
  )
  const displayName = info?.name ?? DRIFTER_INFO.name

  useEffect(() => {
    if (requested.current) return
    requested.current = true
    sfx.confirm()
    generateReport({
      ending, overridden: g.overridden, regret: g.regret, timeouts: g.timeouts,
      path: g.path, gameScore: g.gameScore, gameDetail: g.gameDetail,
    }).then(r => {
      setReport(r)
      // 上人生墙（展位排队预告位）
      pushHall({ title, career: displayName, rank: g.gameRank ?? '—', score: g.gameScore })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 分享卡预合成：报告就绪即离屏渲染成 blob，点击时才能同步触发下载（保住用户激活态）
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
      ctx.fillText('镜 像 自 我 · 人 生 预 演', W / 2, 130)
      ctx.fillStyle = '#f4efe4'
      ctx.font = 'bold 92px serif'
      ctx.fillText(displayName, W / 2, 300)
      ctx.fillStyle = '#d8b878'
      ctx.font = '40px serif'
      ctx.fillText(`「${title}」`, W / 2, 390)
      if (g.gameRank) {
        ctx.fillStyle = '#ffd86a'
        ctx.font = 'bold 34px serif'
        ctx.fillText(`RANK ${g.gameRank}`, W / 2, 448)
      }

      ctx.strokeStyle = 'rgba(201,168,106,.6)'
      ctx.beginPath(); ctx.moveTo(W * 0.3, 480); ctx.lineTo(W * 0.7, 480); ctx.stroke()

      ctx.fillStyle = '#d8d2c4'
      ctx.font = '30px serif'
      wrapText(ctx, rep.paragraphs[2] ?? '', W / 2, 560, W * 0.74, 52)
      ctx.fillStyle = '#ece0c4'
      ctx.font = 'italic 34px serif'
      wrapText(ctx, `—— ${rep.finalWord}`, W / 2, 1130, W * 0.7, 56)

      ctx.fillStyle = 'rgba(255,255,255,.4)'
      ctx.font = '22px sans-serif'
      ctx.fillText('POWERED BY RTX LOCAL AI · GENJI @ BILIBILI WORLD', W / 2, H - 70)

      // blob URL 而非巨型 data URL：data URL 下载在部分环境会被静默拦截
      cv.toBlob(b => resolve(URL.createObjectURL(b!)), 'image/jpeg', 0.9)
    }

    const src = career === 'painter' && g.graffitiData ? g.graffitiData : endStill
    const img = new Image()
    img.onload = () => {
      const s = Math.max(W / img.width, H / img.height)
      ctx.drawImage(img, (W - img.width * s) / 2, (H - img.height * s) / 2, img.width * s, img.height * s)
      finish()
    }
    img.onerror = () => { ctx.fillStyle = '#0a0e18'; ctx.fillRect(0, 0, W, H); finish() }
    img.src = src
  })

  // 报告就绪 → 预合成分享卡
  useEffect(() => {
    if (!report) return
    let alive = true
    composeCard(report).then(url => { if (alive) setCardUrl(url); else URL.revokeObjectURL(url) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report])
  useEffect(() => () => { if (cardUrl) URL.revokeObjectURL(cardUrl) }, [cardUrl])

  // 点击：同步触发下载（anchor 挂进 DOM）+ 弹出预览浮层兜底
  const exportCard = () => {
    if (!cardUrl) return
    sfx.click()
    const a = document.createElement('a')
    a.download = `人生预演_${displayName}_${title}.jpg`
    a.href = cardUrl
    document.body.appendChild(a)
    a.click()
    a.remove()
    setShowCard(true)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const bg = career === 'painter' && g.graffitiData ? g.graffitiData : endStill

  return (
    <div className="report" data-testid="report">
      <div className="scene-still" style={{
        backgroundImage: `url(${bg})`, opacity: 0.28, filter: 'saturate(.8)',
      }} />
      <div className="report-card">
        <div className="ai-tag">{report ? (report.fromAI ? 'RTX LOCAL AI' : 'OFFLINE MODE') : 'RTX LOCAL AI'}</div>
        <div className="rk">人生预演报告 · LIFE REHEARSAL REPORT</div>
        <h2>{displayName}的一生</h2>
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
        <Radar />
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

// 四维人格雷达：勇 / 彩 / 驰 / 定（坚定 = 顶住类选择的次数）
function Radar() {
  const g = useGame()
  const firm = g.path.filter(p => ['D1', 'G1', 'E1'].includes(p.choiceId)).length
  const dims = [
    { label: '勇', v: g.stats.brave },
    { label: '彩', v: g.stats.color },
    { label: '驰', v: g.stats.speed },
    { label: '定', v: firm * 1.6 },
  ]
  const max = Math.max(4, ...dims.map(d => d.v))
  const C = 100, R = 74
  const pt = (i: number, r: number) => {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / dims.length
    return `${C + Math.cos(a) * r},${C + Math.sin(a) * r}`
  }
  const poly = dims.map((d, i) => pt(i, (Math.max(0.5, d.v) / max) * R)).join(' ')
  return (
    <div className="radar" data-testid="radar">
      <svg viewBox="0 0 200 200">
        {[0.33, 0.66, 1].map(k => (
          <polygon key={k} points={dims.map((_, i) => pt(i, R * k)).join(' ')}
                   fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="1" />
        ))}
        {dims.map((_, i) => (
          <line key={i} x1={C} y1={C}
                x2={pt(i, R).split(',')[0]} y2={pt(i, R).split(',')[1]}
                stroke="rgba(255,255,255,.08)" strokeWidth="1" />
        ))}
        <polygon points={poly} fill="rgba(216,184,120,.22)" stroke="#d8b878" strokeWidth="1.6" />
        {dims.map((d, i) => {
          const [x, y] = pt(i, R + 15).split(',').map(Number)
          return <text key={d.label} x={x} y={y + 4} textAnchor="middle" fontSize="13"
                       fill="#cfc4a8" letterSpacing="2">{d.label}</text>
        })}
      </svg>
      <div className="cap">人 格 倾 向</div>
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
