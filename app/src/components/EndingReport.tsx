import { useEffect, useMemo, useRef, useState } from 'react'
import { useGame } from '../store'
import { CAREER_INFO, Career, Stat, MAX_REACH, NODES } from '../story'
import { stillUrl } from '../lib/placeholder'
import { generateReport, Report } from '../lib/ai'
import { computeTitle } from '../lib/titles'
import { pushHall } from '../lib/hall'
import FlowChart from './FlowChart'
import { useStill } from './useStill'
import { sfx } from '../lib/audio'

// 结局印记：路线里第二强的倾向 = "你是哪一种{职业}"，决定海报变体剧照与印记文案
// 变体图命名 end_{career}_{trait}.jpg（素材未落位时自动回退基础结局图，随放随生效）
const TRAIT_FLAVOR: Record<Stat, { label: string; line: string }> = {
  guard:  { label: '守望型', line: '把别人的安全，排在自己前面。' },
  create: { label: '造梦型', line: '规则之外，总能画出另一条路。' },
  swift:  { label: '疾风型', line: '等不及世界慢慢来。' },
  rhythm: { label: '律动型', line: '心里始终有一支不停的拍子。' },
  far:    { label: '远望型', line: '看的从来不是眼前这一步。' },
}
const OWN_STAT: Record<Career, Stat> = {
  soldier: 'guard', painter: 'create', racer: 'swift', musician: 'rhythm', astronaut: 'far',
}

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
  const [streamText, setStreamText] = useState('')
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

  // 结局个性化：次强倾向选 end_{career}_{trait} 变体剧照，缺图回退基础图
  const variantTrait = useMemo(() => {
    const cands = (Object.keys(MAX_REACH) as Stat[])
      .filter(st => st !== OWN_STAT[ending])
      .map(st => ({ st, score: g.stats[st] / Math.sqrt(MAX_REACH[st]) }))
      .filter(a => a.score > 0) // 运维直达全 0 → 无印记，走基础图
      .sort((a, b) => b.score - a.score)
    return cands[0]?.st ?? null
  }, [g.stats, ending])
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
  const altLives = useMemo(() => {
    const order: [Stat, Career][] = [
      ['guard', 'soldier'], ['create', 'painter'], ['swift', 'racer'],
      ['rhythm', 'musician'], ['far', 'astronaut'],
    ]
    return order
      .filter(([, c]) => c !== ending)
      .map(([st, c]) => ({ c, score: g.stats[st] / Math.sqrt(MAX_REACH[st]) }))
      .filter(a => a.score > 0) // 0 分维度不算"差点走上的路"（运维直达时全 0，整节隐藏）
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map(({ c }) => ({ name: CAREER_INFO[c].name, slogan: CAREER_INFO[c].slogan }))
  }, [g.stats, ending])

  // 人生时间线（P2）：8 节点选择按剧情序缩成横向人生轴
  const timeline = useMemo(() => {
    const order = ['A', 'B', 'F', 'C', 'G', 'D', 'H', 'E']
    const byNode = new Map(g.path.map(p => [p.nodeId, p.choiceText]))
    return order
      .filter(id => byNode.has(id))
      .map(id => ({
        nodeId: id,
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
    }, t => setStreamText(t)).then(r => {
      setReport(r)
      pushHall({ title, career: info.name, rank: g.gameRank ?? '—', score: g.gameScore })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 分享海报预合成（附录 C 规格·竖版 1080×1440）：
  // 顶部=类型代码+大称号 / 中部=结局剧照全幅+slogan 叠字 / 底部=4 轴微缩条+结语+二维码位+落款
  const composeCard = (rep: Report): Promise<string> => new Promise(resolve => {
    const W = 1080, H = 1440
    const P_TOP = 330, P_H = 700 // 剧照带 330..1030
    const BG = '#0a0d16'
    const cv = document.createElement('canvas')
    cv.width = W; cv.height = H
    const ctx = cv.getContext('2d')!

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
      ctx.fillStyle = '#8fa8c8'
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
      dg.addColorStop(0, 'transparent'); dg.addColorStop(0.5, '#c9a86a'); dg.addColorStop(1, 'transparent')
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

      // 二维码位（右下；离线指向待定，先以镜面印章占位，框位即终版扫码框）
      const QS = 136, qx = W - 90 - QS, qy = H - 90 - QS
      ctx.strokeStyle = 'rgba(216,184,120,.75)'
      ctx.lineWidth = 2
      ctx.strokeRect(qx, qy, QS, QS)
      ctx.lineWidth = 1
      ctx.strokeRect(qx + 8, qy + 8, QS - 16, QS - 16)
      ctx.fillStyle = 'rgba(216,184,120,.9)'
      ctx.font = '56px serif'
      ctx.fillText('镜', qx + QS / 2, qy + QS / 2 + 20)

      // 落款（左下）
      ctx.textAlign = 'left'
      ctx.fillStyle = '#c9a86a'
      ctx.font = '26px serif'
      ctx.fillText('镜 像 自 我 · 人 生 预 演', 90, H - 134)
      ctx.fillStyle = 'rgba(255,255,255,.4)'
      ctx.font = '17px sans-serif'
      ctx.fillText('POWERED BY RTX LOCAL AI · GENJI @ BILIBILI WORLD', 90, H - 96)

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

  const bg = ending === 'painter' && g.graffitiData ? g.graffitiData : heroStill

  return (
    <div className="report" data-testid="report">
      <div className="scene-still" style={{
        backgroundImage: `url(${bg})`, opacity: 0.28, filter: 'saturate(.8)',
        pointerEvents: 'none', // 装饰背景，双保险：即使层叠再变也不拦点击
      }} />
      <div className="report-card">
        <div className="ai-tag">{report ? (report.fromAI ? 'RTX LOCAL AI' : 'OFFLINE MODE') : 'RTX LOCAL AI'}</div>
        {/* 本地推理遥测（展台"算力可见化"）：全部来自真实生成过程，字/秒实测不估算 */}
        {report?.fromAI && report.stats && (
          <div className="ai-stats" data-testid="ai-stats">
            {report.stats.model} · 本地生成 {report.stats.chars} 字 / {report.stats.seconds.toFixed(1)}s
            · <b>{report.stats.charsPerSec} 字/秒</b> · 零云端请求
          </div>
        )}
        <div className="rk">人生预演报告 · TYPE <span data-testid="type-code">{typeCode}</span></div>
        <h2>{flavor ? flavor.label : ''}{info.name}的一生</h2>
        <div className="slogan">{info.slogan}</div>
        {flavor && <div className="imprint" data-testid="imprint">印记 · {flavor.line}</div>}
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
        <div className="report-actions">
          <button className="primary" data-testid="save-card" onClick={exportCard} disabled={!cardUrl}>
            {saved ? '已保存 ✓' : cardUrl ? '保存分享卡' : '生成中…'}
          </button>
          <button data-testid="retry-game" onClick={() => { sfx.confirm(); useGame.getState().retryGame() }}>
            再试一次
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
