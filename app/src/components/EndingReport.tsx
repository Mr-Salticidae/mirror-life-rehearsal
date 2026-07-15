import { useEffect, useMemo, useRef, useState } from 'react'
import { useGame } from '../store'
import { CAREER_INFO, NODES } from '../story'
import { stillUrl } from '../lib/placeholder'
import { generateReport, Report } from '../lib/ai'
import { computeTitle } from '../lib/titles'
import { pushHall } from '../lib/hall'
import { TRAIT_FLAVOR, STAT_ORDER, computeAxes, computeVariantTrait, computeAltLives } from '../lib/reportModel'
import { SharePayload, buildShareUrl, paintQr, QR_URL_BUDGET } from '../lib/share'
import FlowChart from './FlowChart'
import PrintReport, { printCardA4, printFullReport } from './PrintReport'
import { useStill } from './useStill'
import { sfx } from '../lib/audio'

export default function EndingReport() {
  const g = useGame()
  const ending = g.ending!
  const info = CAREER_INFO[ending]
  const endStill = useStill(info.endStill, info.palette, `结局·${info.name}`)
  const [report, setReport] = useState<Report | null>(null)
  const [streamText, setStreamText] = useState('')
  const [cardUrl, setCardUrl] = useState<string | null>(null)
  const [showCard, setShowCard] = useState(false)
  const [saved, setSaved] = useState(false)
  // 扫码链接：undefined=构建中，null=构建失败（海报回退镜印章，侧栏隐藏）
  const [shareUrl, setShareUrl] = useState<string | null | undefined>(undefined)
  const qrCanvas = useRef<HTMLCanvasElement>(null)
  const printRef = useRef<HTMLDivElement>(null)
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

  // 结局个性化：次强倾向选 end_{career}_{trait} 变体剧照，缺图回退基础图
  const variantTrait = useMemo(() => computeVariantTrait(g.stats, ending), [g.stats, ending])
  const variantId = variantTrait ? `${info.endStill}_${variantTrait}` : null
  const [variantOk, setVariantOk] = useState(false)
  useEffect(() => {
    setVariantOk(false)
    if (!variantId) return
    let alive = true
    const im = new Image()
    im.onload = () => { if (alive) setVariantOk(true) }
    im.src = stillUrl(variantId)
    return () => { alive = false }
  }, [variantId])
  const heroStill = variantOk && variantId ? stillUrl(variantId) : endStill
  const flavor = variantTrait ? TRAIT_FLAVOR[variantTrait] : null

  // 镜子没给你的人生：归一化第 2/3 高的维度对应职业
  const altLives = useMemo(() => computeAltLives(g.stats, ending), [g.stats, ending])

  // 人生时间线（P2）：8 节点选择按剧情序缩成横向人生轴
  const timeline = useMemo(() => {
    const order = ['A', 'B', 'F', 'C', 'G', 'D', 'H', 'E']
    const byNode = new Map(g.path.map(p => [p.nodeId, p.choiceText]))
    return order
      .filter(id => byNode.has(id))
      .map(id => ({
        nodeId: id,
        age: NODES[id].age,
        place: NODES[id].place,
        choice: (byNode.get(id) ?? '').replace(/[「」"]/g, ''),
      }))
  }, [g.path])

  useEffect(() => {
    if (requested.current) return
    requested.current = true
    sfx.confirm()
    generateReport({
      ending, overridden: g.overridden, regret: g.regret, timeouts: g.timeouts,
      path: g.path, gameScore: g.gameScore, gameDetail: g.gameDetail,
      closeup: g.closeup, // 镜中读心印象：AI 把此刻的特质织进这一生
    }, t => setStreamText(t)).then(r => {
      setReport(r)
      pushHall({ title, career: info.name, rank: g.gameRank ?? '—', score: g.gameScore })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 扫码通道：报告就绪后把数据压进 URL 片段（离线模板只带种子，手机端同模板重生成；真 AI 全文上车）
  useEffect(() => {
    if (!report) return
    let alive = true
    const base: SharePayload = {
      v: 1, c: ending, ti: title, rk: g.gameRank,
      s: STAT_ORDER.map(st => g.stats[st]),
      tl: timeline.map(t => [t.nodeId, t.choice]),
      sc: g.gameScore,
      ...(report.fromAI
        ? { ai: 1 as const, ps: report.paragraphs, fw: report.finalWord,
            cs: report.stats?.charsPerSec }
        : { ai: 0 as const, rg: g.regret ? 1 as const : 0 as const, gd: g.gameDetail }),
    }
    // 码密度预算降配（云端叙事字数足，完整一局的基础载荷都可能超预算）：
    // 逐级丢——读心总结 → 印象小标题 → 时间线选择截短 → 时间线整体；叙事全文永不降（手机页的主体）。
    // 屏幕/海报/打印的印象与时间线呈现不受影响，只影响扫码带走的数据量。
    const trimTl = (p: SharePayload): SharePayload =>
      ({ ...p, tl: p.tl.map(([n, c]) => [n, c.slice(0, 6)] as [string, string]) })
    const noTl = (p: SharePayload): SharePayload => ({ ...p, tl: [] })
    const im = g.closeup
      ? { im: g.closeup.subs.slice(0, 3).map(x => x.sub.slice(0, 16)) }
      : {}
    const variants: SharePayload[] = [
      ...(g.closeup
        ? [{ ...base, ...im, ims: g.closeup.summary.slice(0, 80) },
           { ...base, ...im },
           trimTl({ ...base, ...im })]
        : []),
      base,
      trimTl(base),
      noTl(base),
    ]
    ;(async () => {
      let url = ''
      for (const p of variants) {
        url = await buildShareUrl(p)
        if (url.length <= QR_URL_BUDGET) break
      }
      return url
    })()
      // QA 钩子：控制台可取 __shareUrl 直接验证手机页（展台排查用）
      .then(url => { if (alive) { setShareUrl(url); (window as any).__shareUrl = url } })
      .catch(e => { console.warn('[share] 扫码链接构建失败', e); if (alive) setShareUrl(null) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report])

  // 侧栏大码（现场直接扫屏幕；2x 内部分辨率保证模块边缘清晰）
  useEffect(() => {
    if (!shareUrl || !qrCanvas.current) return
    try {
      const cv = qrCanvas.current
      cv.width = 480; cv.height = 480
      paintQr(cv.getContext('2d')!, shareUrl, 0, 0, 480)
    } catch (e) {
      console.warn('[share] 侧栏二维码绘制失败', e)
      setShareUrl(null)
    }
  }, [shareUrl])

  // 分享海报预合成（附录 C 规格·竖版 1080×1440）：
  // 顶部=类型代码+大称号 / 中部=结局剧照全幅+slogan 叠字 / 底部=人生时间线带+4 轴微缩条+结语+二维码位+落款
  // 个性化：职业调色板点缀（TYPE/分隔线随结局换色）、时间线带、档案编号+日期、AI 溯源行
  const composeCard = (rep: Report, qrText: string | null): Promise<string> => new Promise(resolve => {
    const W = 1080, H = 1440
    const SCALE = 2 // 2x 渲染输出 2160×2880：海报二维码模块保真可扫（1x 下 ~1px/模块糊成灰），文字剧照同步锐化
    const P_TOP = 330, P_H = 700 // 剧照带 330..1030
    const BG = '#0a0d16'
    const cv = document.createElement('canvas')
    cv.width = W * SCALE; cv.height = H * SCALE
    const ctx = cv.getContext('2d')!
    ctx.scale(SCALE, SCALE) // 之后全部按 1080×1440 逻辑坐标绘制

    const finish = (img?: HTMLImageElement) => {
      ctx.fillStyle = BG
      ctx.fillRect(0, 0, W, H)

      // ── 中部：结局剧照全幅（clip 进剧照带，上下缘与底色融合） ──
      if (img) {
        ctx.save()
        ctx.beginPath(); ctx.rect(0, P_TOP, W, P_H); ctx.clip()
        const s = Math.max(W / img.width, P_H / img.height)
        ctx.drawImage(img, (W - img.width * s) / 2, P_TOP + (P_H - img.height * s) / 2,
          img.width * s, img.height * s)
        ctx.restore()
      } else {
        const pg = ctx.createLinearGradient(0, P_TOP, W, P_TOP + P_H)
        pg.addColorStop(0, '#101624'); pg.addColorStop(1, '#05070d')
        ctx.fillStyle = pg; ctx.fillRect(0, P_TOP, W, P_H)
      }
      let bl = ctx.createLinearGradient(0, P_TOP, 0, P_TOP + 90)
      bl.addColorStop(0, BG); bl.addColorStop(1, 'rgba(10,13,22,0)')
      ctx.fillStyle = bl; ctx.fillRect(0, P_TOP, W, 90)
      bl = ctx.createLinearGradient(0, P_TOP + P_H - 120, 0, P_TOP + P_H)
      bl.addColorStop(0, 'rgba(10,13,22,0)'); bl.addColorStop(1, BG)
      ctx.fillStyle = bl; ctx.fillRect(0, P_TOP + P_H - 120, W, 120)

      // slogan 叠字（剧照下缘）；有印记时上方多一行个性化短句
      ctx.textAlign = 'center'
      ctx.shadowColor = 'rgba(0,0,0,.85)'; ctx.shadowBlur = 16
      // 镜中印象（真读心才有）：把"此刻的你"印上海报，最上一行
      if (g.closeup?.subs.length) {
        ctx.fillStyle = '#c8bfae'
        ctx.font = 'italic 22px serif'
        const imp = g.closeup.subs[0].sub.slice(0, 26)
        ctx.fillText(`镜中印象 —— ${imp}`, W / 2, P_TOP + P_H - (flavor ? 136 : 92))
      }
      if (flavor) {
        ctx.fillStyle = '#d8c9a8'
        ctx.font = 'italic 25px serif'
        ctx.fillText(`「${flavor.label}」—— ${flavor.line}`, W / 2, P_TOP + P_H - 92)
      }
      ctx.fillStyle = '#f2ede2'
      ctx.font = '34px serif'
      ctx.fillText(info.slogan, W / 2, P_TOP + P_H - 46)
      ctx.shadowBlur = 0

      // ── 顶部：类型代码 + 大称号（长称号自适应缩字号） ──
      // TYPE 行与分隔线用职业调色板高光色：五条线的海报一眼可分（个性化 · 阶段3）
      ctx.fillStyle = info.palette[2]
      ctx.font = 'bold 34px monospace'
      ctx.fillText(`TYPE ${typeCode}`, W / 2, 104)
      ctx.fillStyle = '#f4efe4'
      for (const fs of [82, 62, 48]) {
        ctx.font = `bold ${fs}px serif`
        if (ctx.measureText(title).width <= 740) break
      }
      ctx.fillText(title, W / 2, 216)
      ctx.fillStyle = '#d8b878'
      ctx.font = '28px serif'
      ctx.fillText(`${flavor ? flavor.label : ''}${info.name}的一生${g.gameRank ? ` · RANK ${g.gameRank}` : ''}`, W / 2, 278)
      const dg = ctx.createLinearGradient(240, 0, 840, 0)
      dg.addColorStop(0, 'transparent'); dg.addColorStop(0.5, info.palette[2]); dg.addColorStop(1, 'transparent')
      ctx.fillStyle = dg
      ctx.fillRect(240, 306, 600, 1.5)

      // 评级印章（右上）
      if (g.gameRank) {
        ctx.save()
        ctx.translate(W - 148, 152)
        ctx.rotate(-0.12)
        ctx.strokeStyle = g.gameRank === 'S' ? '#ffd86a' : g.gameRank === 'A' ? '#8fd8ff' : '#b8c0cc'
        ctx.fillStyle = ctx.strokeStyle
        ctx.lineWidth = 4
        ctx.beginPath(); ctx.arc(0, 0, 54, 0, Math.PI * 2); ctx.stroke()
        ctx.lineWidth = 1.5
        ctx.beginPath(); ctx.arc(0, 0, 45, 0, Math.PI * 2); ctx.stroke()
        ctx.font = 'bold 58px serif'
        ctx.textAlign = 'center'
        ctx.fillText(g.gameRank, 0, 21)
        ctx.restore()
        ctx.textAlign = 'center'
      }

      // ── 人生时间线带（剧照带与 4 轴之间）：8 站地点串成一行，走过的路上卡（个性化 · 阶段3） ──
      if (timeline.length > 0) {
        ctx.fillStyle = '#8fa8c8'
        ctx.font = '17px serif'
        const parts = timeline.map(t => t.place)
        let strip = parts.join('  ·  ')
        // 超宽先收间距再缩字号，保证一行放下
        if (ctx.measureText(strip).width > W - 180) strip = parts.join(' · ')
        if (ctx.measureText(strip).width > W - 180) ctx.font = '15px serif'
        ctx.fillText(strip, W / 2, 1050)
      }

      // ── 底部：4 轴微缩条（横排，带轴名） ──
      const barW = (W - 260) / 4, barY = 1096
      axes.forEach((a, i) => {
        const x = 130 + i * barW + 12
        const w = barW - 24
        ctx.fillStyle = '#c9a86a'
        ctx.font = '19px serif'
        ctx.fillText(a.name, x + w / 2, barY - 18)
        ctx.fillStyle = 'rgba(255,255,255,.15)'
        ctx.fillRect(x, barY, w, 8)
        // 金条锚定优势侧，标签写优势项（同事反馈：占比高的展示出来）
        const domL = a.pct >= 50
        const dp = domL ? a.pct : 100 - a.pct
        const fw = w * dp / 100
        ctx.fillStyle = '#d8b878'
        ctx.fillRect(domL ? x : x + w - fw, barY, fw, 8)
        ctx.fillStyle = '#b8ac90'
        ctx.font = '20px serif'
        ctx.fillText(`${domL ? a.l : a.r} ${dp}%`, x + w / 2, barY + 36)
      })

      // 给现实的你（结语，避开右下二维码位收窄行宽）
      ctx.fillStyle = '#ece0c4'
      ctx.font = 'italic 30px serif'
      wrapText(ctx, `—— ${rep.finalWord}`, W / 2 - 70, 1210, W * 0.52, 48)

      // 二维码（右下真码）：扫码手机查看完整图文报告；生成失败回退镜面印章
      // 框位按链接长度自适应（密度守恒）：176px 对应 ≤v22（主导实测的可扫基线），
      // 链接更长则码更复杂，等比放大框位维持每模块像素数——云端叙事字数足时降配后仍可能到 v24+
      const QS = !qrText ? 176 : qrText.length <= 1003 ? 176 : qrText.length <= 1091 ? 184 : 208
      const qx = W - 90 - QS, qy = H - 90 - QS
      ctx.strokeStyle = 'rgba(216,184,120,.75)'
      ctx.lineWidth = 2
      ctx.strokeRect(qx - 5, qy - 5, QS + 10, QS + 10)
      let qrOk = false
      if (qrText) {
        try { paintQr(ctx, qrText, qx, qy, QS); qrOk = true }
        catch (e) { console.warn('[share] 海报二维码生成失败，回退印章', e) }
      }
      if (qrOk) {
        ctx.fillStyle = 'rgba(216,184,120,.85)'
        ctx.font = '17px serif'
        // 大框位时提示语移到码下方，避免撞上方 4 轴的百分比标签
        if (QS > 184) ctx.fillText('扫码 · 手机查看完整报告', qx + QS / 2, qy + QS + 24)
        else ctx.fillText('扫码 · 手机查看完整报告', qx + QS / 2, qy - 16)
      } else {
        ctx.lineWidth = 1
        ctx.strokeRect(qx + 8, qy + 8, QS - 16, QS - 16)
        ctx.fillStyle = 'rgba(216,184,120,.9)'
        ctx.font = '56px serif'
        ctx.fillText('镜', qx + QS / 2, qy + QS / 2 + 20)
      }

      // 落款（左下）+ 档案编号/日期 + AI 溯源行（个性化 · 阶段3）
      ctx.textAlign = 'left'
      ctx.fillStyle = '#c9a86a'
      ctx.font = '26px serif'
      ctx.fillText('镜 像 自 我 · 人 生 预 演', 90, H - 134)
      ctx.fillStyle = 'rgba(255,255,255,.4)'
      ctx.font = '17px sans-serif'
      ctx.fillText('POWERED BY RTX LOCAL AI · GENJI @ BILIBILI WORLD', 90, H - 96)
      const d = new Date()
      const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
      const serial = `MLR-${ymd}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`
      const trace = rep.fromAI && rep.stats
        ? (rep.stats.local
            ? `档案 ${serial} · RTX 本地 AI 实时生成 · ${rep.stats.charsPerSec} 字/秒 · 零云端请求`
            : `档案 ${serial} · AI 实时生成 · ${rep.stats.model} · ${rep.stats.charsPerSec} 字/秒`)
        : `档案 ${serial} · 离线预演档案`
      ctx.fillStyle = 'rgba(216,184,120,.55)'
      ctx.font = '15px monospace'
      ctx.fillText(trace, 90, H - 64)

      // 双层金框
      ctx.strokeStyle = 'rgba(216,184,120,.7)'
      ctx.lineWidth = 3
      ctx.strokeRect(36, 36, W - 72, H - 72)
      ctx.lineWidth = 1
      ctx.strokeRect(50, 50, W - 100, H - 100)

      cv.toBlob(b => resolve(URL.createObjectURL(b!)), 'image/jpeg', 0.9)
    }

    const src = ending === 'painter' && g.graffitiData ? g.graffitiData : heroStill
    const img = new Image()
    img.onload = () => finish(img)
    img.onerror = () => finish()
    img.src = src
  })

  useEffect(() => {
    if (!report || shareUrl === undefined) return // 等扫码链接定型（成功或失败）再合成，避免海报二次生成
    let alive = true
    composeCard(report, shareUrl).then(url => { if (alive) setCardUrl(url); else URL.revokeObjectURL(url) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report, shareUrl])
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

  const bg = ending === 'painter' && g.graffitiData ? g.graffitiData : heroStill

  // 展台打印两版式：卡片=A4 整页；完整报告=210mm 卷纸、页长随内容自适应（≤1.2m）满幅无白边
  const doPrintCard = () => { sfx.click(); printCardA4() }
  const doPrintReport = () => {
    if (!printRef.current) return
    sfx.click()
    printFullReport(printRef.current)
  }

  return (
    <div className="report" data-testid="report">
      <div className="scene-still" style={{
        backgroundImage: `url(${bg})`, opacity: 0.28, filter: 'saturate(.8)',
        pointerEvents: 'none', // 装饰背景，双保险：即使层叠再变也不拦点击
      }} />
      <div className="report-card">
        <div className="ai-tag">
          {report
            ? (report.fromAI ? (report.stats?.local ? 'RTX LOCAL AI' : 'CLOUD AI') : 'OFFLINE MODE')
            : 'AI GENERATING'}
        </div>
        {/* 生成溯源：字数来自真实生成过程；模型名/耗时/字每秒不对观众展示（来源由上方标签承担） */}
        {report?.fromAI && report.stats && (
          <div className="ai-stats" data-testid="ai-stats">
            AI 生成 {report.stats.chars} 字
          </div>
        )}
        <div className="rk">人生预演报告 · TYPE <span data-testid="type-code">{typeCode}</span></div>
        <h2>{flavor ? flavor.label : ''}{info.name}的一生</h2>
        <div className="slogan">{info.slogan}</div>
        {flavor && <div className="imprint" data-testid="imprint">印记 · {flavor.line}</div>}
        {g.closeup && g.closeup.subs.length > 0 && (
          <div className="imprint" data-testid="mirror-imprint">
            镜中印象 · {g.closeup.subs.slice(0, 2).map(x => x.sub).join('；')}
          </div>
        )}
        {report ? (
          <>
            <div className="honor" data-testid="honor">
              「{title}」{g.gameRank && <> · RANK {g.gameRank}</>}
            </div>
            {report.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
            <p className="final-word">{report.finalWord}</p>
            {timeline.length > 0 && (
              <div className="life-timeline" data-testid="life-timeline">
                <div className="lt-title">人 生 时 间 线</div>
                <div className="lt-axis">
                  {timeline.map((s, i) => (
                    <div className="lt-item" key={s.nodeId}>
                      <div className={`lt-choice ${i % 2 ? 'high' : ''}`}>{s.choice}</div>
                      <span className="lt-dot" />
                      <div className="lt-place">{s.place}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : streamText ? (
          <>
            <div className="honor" data-testid="honor">
              「{title}」{g.gameRank && <> · RANK {g.gameRank}</>}
            </div>
            <div className="report-stream" data-testid="report-stream">{streamText}</div>
          </>
        ) : (
          <div className="report-loading">本地 AI 正在回放你的一生……</div>
        )}
      </div>
      <div className="report-side">
        {/* 直跳调试无叙事轨迹时隐藏全???矩阵，避免被当成 bug（QA D-06） */}
        {g.path.length > 0 ? (
          <FlowChart mode="final" />
        ) : (
          <div className="debug-note" data-testid="debug-note">调 试 直 达 · 无 叙 事 轨 迹</div>
        )}
        <div className="axes-grid" data-testid="axes">
          {axes.map(a => {
            // 占比高的一侧在左、低的在右（同事反馈）：标签/百分比/金条统一按"高左低右"排列，高占比端高亮
            const hiL = a.pct >= 50                 // l 占优则 l 留左，否则把 r 换到左侧
            const left = hiL ? a.l : a.r
            const right = hiL ? a.r : a.l
            const lp = hiL ? a.pct : 100 - a.pct    // 左（高占比）
            const rp = hiL ? 100 - a.pct : a.pct    // 右（低占比）
            return (
              <div className="axis-card" key={a.name}>
                <div className="ax-name">{a.name}</div>
                <div className="ax-ends">
                  <span className="dom">{left}</span>
                  <span>{right}</span>
                </div>
                <div className="ax-bar">
                  <div className="ax-fill" style={{ width: `${lp}%` }} />
                </div>
                <div className="ax-pct">
                  <span className="dom">{lp}%</span>
                  {' · '}
                  <span>{rp}%</span>
                </div>
              </div>
            )
          })}
        </div>
        {altLives.length > 0 && (
          <div className="alt-lives" data-testid="alt-lives">
            <div className="al-title">镜子没给你的人生</div>
            {altLives.map(a => (
              <div className="al-item" key={a.name}><b>{a.name}</b> —— {a.slogan}</div>
            ))}
          </div>
        )}
        {shareUrl && (
          <div className="qr-card" data-testid="qr-card">
            <canvas ref={qrCanvas} />
            <div className="qr-text">
              <b>扫码带走这份人生</b>
              <span>手机查看完整图文报告</span>
            </div>
          </div>
        )}
        <div className="report-actions">
          <button className="primary" data-testid="save-card" onClick={exportCard} disabled={!cardUrl}>
            {saved ? '已保存 ✓' : cardUrl ? '保存分享卡' : '生成中…'}
          </button>
          <button data-testid="print-card" onClick={doPrintCard} disabled={!cardUrl}>
            打印卡片
          </button>
          <button data-testid="print-report" onClick={doPrintReport} disabled={!report}>
            打印完整报告
          </button>
          <button data-testid="retry-game" onClick={() => { sfx.confirm(); useGame.getState().retryGame() }}>
            再试一次
          </button>
          <button data-testid="restart" onClick={() => { sfx.whoosh(); useGame.getState().toAttract() }}>
            重新预演
          </button>
        </div>
      </div>

      {/* 打印版面常驻屏外（剧照/二维码提前就绪），点打印时量高注入 @page 再唤起打印 */}
      {report && (
        <PrintReport
          sheetRef={printRef}
          ending={ending}
          title={title}
          typeCode={typeCode}
          rank={g.gameRank}
          hero={bg}
          flavor={flavor}
          report={report}
          closeup={g.closeup}
          timeline={timeline}
          axes={axes}
          altLives={altLives}
          shareUrl={shareUrl ?? null}
          cardUrl={cardUrl}
        />
      )}

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
