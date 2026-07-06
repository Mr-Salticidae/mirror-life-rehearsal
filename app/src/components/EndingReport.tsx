import { useEffect, useRef, useState } from 'react'
import { useGame } from '../store'
import { CAREER_INFO } from '../story'
import { generateReport, Report } from '../lib/ai'
import FlowChart from './FlowChart'
import { useStill } from './useStill'
import { sfx } from '../lib/audio'

export default function EndingReport() {
  const g = useGame()
  const career = g.career!
  const info = CAREER_INFO[career]
  const endStill = useStill(info.endStill, info.palette, `结局·${info.name}`)
  const [report, setReport] = useState<Report | null>(null)
  const requested = useRef(false)

  useEffect(() => {
    if (requested.current) return
    requested.current = true
    sfx.confirm()
    generateReport({
      career, overridden: g.overridden, regret: g.regret,
      path: g.path, gameScore: g.gameScore, gameDetail: g.gameDetail,
    }).then(setReport)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 分享卡导出：1080x1440 竖版
  const exportCard = () => {
    if (!report) return
    sfx.click()
    const W = 1080, H = 1440
    const cv = document.createElement('canvas')
    cv.width = W; cv.height = H
    const ctx = cv.getContext('2d')!

    const finish = () => {
      // 暗角 + 文案
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
      ctx.fillText(info.name, W / 2, 300)
      ctx.fillStyle = '#d8b878'
      ctx.font = '40px serif'
      ctx.fillText(`「${report.honor}」`, W / 2, 390)

      // 分隔线
      ctx.strokeStyle = 'rgba(201,168,106,.6)'
      ctx.beginPath(); ctx.moveTo(W * 0.3, 450); ctx.lineTo(W * 0.7, 450); ctx.stroke()

      // 叙事摘录（第一段 + finalWord）
      ctx.fillStyle = '#d8d2c4'
      ctx.font = '30px serif'
      wrapText(ctx, report.paragraphs[2] ?? '', W / 2, 540, W * 0.74, 52)
      ctx.fillStyle = '#ece0c4'
      ctx.font = 'italic 34px serif'
      wrapText(ctx, `—— ${report.finalWord}`, W / 2, 1130, W * 0.7, 56)

      ctx.fillStyle = 'rgba(255,255,255,.4)'
      ctx.font = '22px sans-serif'
      ctx.fillText('POWERED BY RTX LOCAL AI · GENJI @ BILIBILI WORLD', W / 2, H - 70)

      const a = document.createElement('a')
      a.download = `人生预演_${info.name}_${report.honor}.jpg`
      a.href = cv.toDataURL('image/jpeg', 0.9)
      a.click()
    }

    // 底图：画家用涂鸦作品，其他用结局剧照
    const src = career === 'painter' && g.graffitiData ? g.graffitiData : endStill
    const img = new Image()
    img.onload = () => {
      const s = Math.max(W / img.width, H / img.height)
      ctx.drawImage(img, (W - img.width * s) / 2, (H - img.height * s) / 2, img.width * s, img.height * s)
      finish()
    }
    img.onerror = () => { ctx.fillStyle = '#0a0e18'; ctx.fillRect(0, 0, W, H); finish() }
    img.src = src
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
        <h2>{info.name}的一生</h2>
        {report ? (
          <>
            <div className="honor">「{report.honor}」{g.overridden && ' · 换过一扇门'}{g.regret && ' · 带着一次遗憾'}</div>
            {report.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
            <p className="final-word">{report.finalWord}</p>
          </>
        ) : (
          <div className="report-loading">本地 AI 正在回放你的一生……</div>
        )}
      </div>
      <div className="report-side">
        <FlowChart mode="final" />
        <div className="report-actions">
          <button className="primary" onClick={exportCard} disabled={!report}>保存分享卡</button>
          <button data-testid="restart" onClick={() => { sfx.whoosh(); useGame.getState().toAttract() }}>
            重新预演
          </button>
        </div>
      </div>
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
