import { RefObject, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Career, CAREER_INFO } from '../story'
import { Report } from '../lib/ai'
import type { CloseupDigest } from '../lib/closeup'
import { Axis } from '../lib/reportModel'
import { paintQr } from '../lib/share'

// 展台打印·两种版式（纸宽均 210mm）：
//   卡片   → A4 竖版整页（210×297mm），海报居中、上下以同底色补满，无白边；
//   完整报告 → 卷纸连续长条，页长=打印版面实测高度（上限 1.2m），底色满幅无白边，
//             超长时按 1.2m 分页、分页处底色连续无缝衔接。
// 两版面常驻屏外（剧照/二维码提前就绪），打印时 html[data-print] 决定出哪一张。
// 展台静默直印（不弹打印对话框）：kiosk Chrome 启动加 --kiosk-printing，走系统默认打印机。

const PAPER_W_MM = 210
const PAPER_MAX_MM = 1200
const PX2MM = 25.4 / 96 // CSS 像素 → 毫米

function firePrint(mode: 'card' | 'report', pageSize: string) {
  let st = document.getElementById('print-page-style') as HTMLStyleElement | null
  if (!st) {
    st = document.createElement('style')
    st.id = 'print-page-style'
    document.head.appendChild(st)
  }
  st.textContent = `@page { size: ${pageSize}; margin: 0; }`
  document.documentElement.setAttribute('data-print', mode)
  try { window.print() } finally { document.documentElement.removeAttribute('data-print') }
}

// 打印卡片：A4 整页
export function printCardA4() {
  firePrint('card', '210mm 297mm')
}

// 打印完整报告：页长按版面实际高度动态注入（取整 +2mm 余量），版面 min-height 撑满页长防尾部露白
export function printFullReport(el: HTMLElement) {
  el.style.minHeight = '' // 清掉上次撑高，按本次内容重新实测（再试一次后报告会变短）
  const h = Math.min(PAPER_MAX_MM, Math.max(PAPER_W_MM, Math.ceil(el.offsetHeight * PX2MM) + 2))
  el.style.minHeight = `${h}mm`
  firePrint('report', `${PAPER_W_MM}mm ${h}mm`)
}

interface Props {
  sheetRef: RefObject<HTMLDivElement>
  ending: Career
  title: string
  typeCode: string
  rank: string | null
  hero: string // 结局剧照（画家为现场涂鸦）
  flavor: { label: string; line: string } | null
  report: Report
  closeup: CloseupDigest | null // 镜中特写读心摘要（真 AI 时才有）
  timeline: { nodeId: string; age: string; place: string; choice: string }[]
  axes: Axis[]
  altLives: { name: string; slogan: string }[]
  shareUrl: string | null
  cardUrl: string | null // 分享卡成图（A4 打印用）
}

export default function PrintReport(p: Props) {
  const info = CAREER_INFO[p.ending]
  const qrRef = useRef<HTMLCanvasElement>(null)
  const [heroOk, setHeroOk] = useState(true)

  useEffect(() => {
    if (!p.shareUrl || !qrRef.current) return
    try {
      const cv = qrRef.current
      cv.width = 480; cv.height = 480
      paintQr(cv.getContext('2d')!, p.shareUrl, 0, 0, 480)
    } catch (e) {
      console.warn('[print] 打印页二维码绘制失败', e)
    }
  }, [p.shareUrl])

  return createPortal(
    <>
      <div className="print-sheet" ref={p.sheetRef} data-testid="print-sheet">
        <div className="ps-frame" />

        <header className="ps-head">
          <div className="ps-brand">镜 像 自 我 · 人 生 预 演</div>
          <div className="ps-type">人生预演报告 · TYPE {p.typeCode}</div>
          <h1 className="ps-title">{p.title}</h1>
          <div className="ps-sub">
            {p.flavor ? p.flavor.label : ''}{info.name}的一生
            {p.rank && <span className="ps-rank">RANK {p.rank}</span>}
          </div>
        </header>

        {heroOk && (
          <figure className="ps-hero">
            <img src={p.hero} alt={`结局 · ${info.name}`} onError={() => setHeroOk(false)} />
            <figcaption>
              {p.flavor && <div className="ps-flavor">「{p.flavor.label}」—— {p.flavor.line}</div>}
              <div className="ps-slogan">{info.slogan}</div>
            </figcaption>
          </figure>
        )}

        <div className="ps-aitag">
          {p.report.fromAI
            ? <>AI 生成{p.report.stats ? ` ${p.report.stats.chars} 字` : ''}</>
            : '离线预演档案'}
        </div>

        {p.closeup && p.closeup.subs.length > 0 && (
          <section className="ps-section">
            <h2>镜 中 印 象</h2>
            {p.closeup.subs.map(x => (
              <div className="ps-alt" key={x.key}><b>{x.key}</b> —— {x.sub}</div>
            ))}
            {p.closeup.summary && <div className="ps-alt">{p.closeup.summary}</div>}
          </section>
        )}

        <section className="ps-body">
          {p.report.paragraphs.map((t, i) => <p key={i}>{t}</p>)}
          <p className="ps-final">—— {p.report.finalWord}</p>
        </section>

        {p.timeline.length > 0 && (
          <section className="ps-section">
            <h2>人 生 时 间 线</h2>
            <ol className="ps-timeline">
              {p.timeline.map(t => (
                <li key={t.nodeId}>
                  <span className="ps-tl-place">{t.age} · {t.place}</span>
                  <span className="ps-tl-choice">{t.choice || '……（犹豫）'}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section className="ps-section">
          <h2>人 格 四 轴</h2>
          <div className="ps-axes">
            {p.axes.map(a => {
              // 与报告卡同规：占比高的一侧在左并高亮
              const hiL = a.pct >= 50
              const lp = hiL ? a.pct : 100 - a.pct
              return (
                <div className="ps-axis" key={a.name}>
                  <div className="ps-ax-name">{a.name}</div>
                  <div className="ps-ax-row">
                    <span className="dom">{hiL ? a.l : a.r}</span>
                    <div className="ps-ax-bar"><div style={{ width: `${lp}%` }} /></div>
                    <span>{hiL ? a.r : a.l}</span>
                  </div>
                  <div className="ps-ax-pct"><span className="dom">{lp}%</span> · {100 - lp}%</div>
                </div>
              )
            })}
          </div>
        </section>

        {p.altLives.length > 0 && (
          <section className="ps-section">
            <h2>镜 子 没 给 你 的 人 生</h2>
            {p.altLives.map(a => (
              <div className="ps-alt" key={a.name}><b>{a.name}</b> —— {a.slogan}</div>
            ))}
          </section>
        )}

        {p.shareUrl && (
          <div className="ps-qr">
            <canvas ref={qrRef} />
            <div className="ps-qr-text">
              <b>扫码带走这份人生</b>
              <span>手机查看完整图文报告</span>
            </div>
          </div>
        )}

        <footer className="ps-foot">
          <div>镜 像 自 我 · 人 生 预 演</div>
          <span>MIRROR LIFE REHEARSAL · INTERACTIVE FILM</span>
        </footer>
      </div>

      {p.cardUrl && (
        <div className="print-card" data-testid="print-card">
          <img src={p.cardUrl} alt="人生预演分享卡" />
        </div>
      )}
    </>,
    document.body,
  )
}
