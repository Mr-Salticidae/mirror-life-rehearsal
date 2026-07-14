import { useMemo, useState } from 'react'
import { CAREER_INFO, NODES, Stat } from '../story'
import { stillUrl } from '../lib/placeholder'
import { templateReport } from '../lib/ai'
import { TRAIT_FLAVOR, STAT_ORDER, computeAxes, computeVariantTrait, computeAltLives } from '../lib/reportModel'
import { SharePayload } from '../lib/share'

// 手机端完整图文报告：与展台报告同一套推导（reportModel），数据来自扫码载荷
export default function MobileReport({ p }: { p: SharePayload }) {
  const info = CAREER_INFO[p.c]
  const stats = useMemo(() => {
    const s = {} as Record<Stat, number>
    STAT_ORDER.forEach((st, i) => { s[st] = p.s[i] ?? 0 })
    return s
  }, [p.s])

  const { axes, typeCode } = useMemo(() => {
    const r = computeAxes(stats)
    const empty = Object.values(stats).every(v => v === 0)
    return empty ? { axes: r.axes, typeCode: info.typeCode } : r
  }, [stats, info.typeCode])

  const variantTrait = useMemo(() => computeVariantTrait(stats, p.c), [stats, p.c])
  const flavor = variantTrait ? TRAIT_FLAVOR[variantTrait] : null
  const altLives = useMemo(() => computeAltLives(stats, p.c), [stats, p.c])

  // 叙事文本：真 AI 全文随码而来；离线模板用同一模板从种子重新生成
  const { paragraphs, finalWord } = useMemo(() => {
    if (p.ai === 1 && p.ps?.length) return { paragraphs: p.ps, finalWord: p.fw ?? '' }
    const t = templateReport({
      ending: p.c, overridden: false, regret: p.rg === 1, timeouts: 0,
      path: [], gameScore: p.sc ?? 0, gameDetail: p.gd ?? '',
    })
    return { paragraphs: t.paragraphs, finalWord: t.finalWord }
  }, [p])

  const timeline = useMemo(() =>
    (p.tl ?? [])
      .filter(([id]) => NODES[id])
      .map(([id, choice]) => ({ id, place: NODES[id].place, age: NODES[id].age, choice })),
  [p.tl])

  // 结局剧照：变体图 → 基础图 → 隐藏（纯渐变兜底）
  const [heroStep, setHeroStep] = useState(0)
  const heroSrcs = [
    ...(variantTrait ? [stillUrl(`${info.endStill}_${variantTrait}`)] : []),
    stillUrl(info.endStill),
  ]
  const heroSrc = heroStep < heroSrcs.length ? heroSrcs[heroStep] : null

  return (
    <div className="m-report">
      <header className="m-head">
        <div className="m-type">人生预演报告 · TYPE {typeCode}</div>
        <h1 className="m-title">{p.ti}</h1>
        <div className="m-sub">
          {flavor ? flavor.label : ''}{info.name}的一生
          {p.rk && <span className="m-rank" data-rank={p.rk}>RANK {p.rk}</span>}
        </div>
      </header>

      <figure className="m-hero" style={{ background: `linear-gradient(160deg, ${info.palette[0]}, ${info.palette[1]})` }}>
        {heroSrc && (
          <img src={heroSrc} alt={`结局 · ${info.name}`} onError={() => setHeroStep(s => s + 1)} />
        )}
        <figcaption>
          {flavor && <div className="m-flavor">「{flavor.label}」—— {flavor.line}</div>}
          <div className="m-slogan">{info.slogan}</div>
        </figcaption>
      </figure>

      <div className="m-aitag">
        {p.ai === 1
          ? <>由展台 RTX 本地 AI 生成{p.cs ? ` · ${p.cs} 字/秒 · 零云端请求` : ' · 零云端请求'}</>
          : '离线预演档案'}
      </div>

      {p.im && p.im.length > 0 && (
        <section className="m-section">
          <h2>镜 中 印 象</h2>
          {p.im.map((t, i) => <div className="m-alt" key={i}>{t}</div>)}
          {p.ims && <div className="m-alt">—— {p.ims}</div>}
        </section>
      )}

      <section className="m-body">
        {paragraphs.map((t, i) => <p key={i}>{t}</p>)}
        <p className="m-final">—— {finalWord}</p>
      </section>

      {timeline.length > 0 && (
        <section className="m-section">
          <h2>人 生 时 间 线</h2>
          <ol className="m-timeline">
            {timeline.map(t => (
              <li key={t.id}>
                <span className="m-tl-place">{t.age} · {t.place}</span>
                <span className="m-tl-choice">{t.choice}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="m-section">
        <h2>人 格 四 轴</h2>
        <div className="m-axes">
          {axes.map(a => {
            const hiL = a.pct >= 50
            const left = hiL ? a.l : a.r
            const right = hiL ? a.r : a.l
            const lp = hiL ? a.pct : 100 - a.pct
            return (
              <div className="m-axis" key={a.name}>
                <div className="m-ax-name">{a.name}</div>
                <div className="m-ax-row">
                  <span className="dom">{left}</span>
                  <div className="m-ax-bar"><div style={{ width: `${lp}%` }} /></div>
                  <span>{right}</span>
                </div>
                <div className="m-ax-pct"><span className="dom">{lp}%</span> · {100 - lp}%</div>
              </div>
            )
          })}
        </div>
      </section>

      {altLives.length > 0 && (
        <section className="m-section">
          <h2>镜 子 没 给 你 的 人 生</h2>
          {altLives.map(a => (
            <div className="m-alt" key={a.name}><b>{a.name}</b> —— {a.slogan}</div>
          ))}
        </section>
      )}

      <footer className="m-foot">
        <div>镜 像 自 我 · 人 生 预 演</div>
        <span>POWERED BY RTX LOCAL AI · GENJI @ BILIBILI WORLD</span>
      </footer>
    </div>
  )
}
