import { useEffect, useMemo, useRef, useState } from 'react'
import { useGame } from '../store'
import { NODES, CHAPTER_FLOW, Choice, Career, dominantEnding, CAREER_INFO } from '../story'
import { useStill } from './useStill'
import ParallaxStill from './ParallaxStill'
import { sfx } from '../lib/audio'

type Beat = 'lines' | 'choices' | 'doors' | 'consequence'

const CONSEQUENCE_MS = 2600
const AUTO_ADVANCE_MS = 1700
const HOLD_MS = 1000
const FADE_OUT_MS = 900 // 谢幕渐黑时长，与 .scene-out 动画一致

export default function StoryScene() {
  const nodeId = useGame(s => s.nodeId)
  const node = NODES[nodeId]
  const still = useStill(node.still, node.palette, `${node.age}·${node.place}`)

  const [beat, setBeat] = useState<Beat>('lines')
  const [lineIdx, setLineIdx] = useState(0)
  const [typed, setTyped] = useState(0)
  const [consequence, setConsequence] = useState('')
  const [timeLeft, setTimeLeft] = useState(node.timer ?? 0)
  const [holdPct, setHoldPct] = useState(0) // 长按选择进度
  const [holdHint, setHoldHint] = useState(false) // 短按提示：这张卡要按住
  const [fading, setFading] = useState(false) // 谢幕渐黑中

  // 回响台词：匹配早前选择后追加
  const lines = useMemo(() => {
    const g = useGame.getState()
    const matched = (node.echoes ?? []).filter(e => {
      if (e.when === 'regret') return g.regret
      if (e.when.startsWith('timeout:')) {
        const nid = e.when.slice(8)
        return g.path.some(p => p.nodeId === nid && p.choiceId === 'timeout')
      }
      return g.path.some(p => p.choiceId === e.when)
    })
    return [...node.lines, ...matched.map(m => m.text)]
  }, [nodeId])

  // 节点已定案（选过/超时）后拒绝二次输入：防快速双击重复加成、防长按满格与超时同帧双触发
  const settled = useRef(false)

  useEffect(() => {
    setBeat('lines'); setLineIdx(0); setTyped(0)
    setConsequence(''); setTimeLeft(node.timer ?? 0); setHoldPct(0)
    setFading(false)
    settled.current = false
  }, [nodeId])

  // 打字机
  const line = lines[lineIdx] ?? ''
  useEffect(() => {
    if (beat !== 'lines') return
    if (typed >= line.length) return
    const t = setTimeout(() => setTyped(v => v + 1), 55)
    return () => clearTimeout(t)
  }, [typed, beat, lineIdx, line])

  // 台词自动播：整行打完后停顿自动下一行（点击可跳）
  useEffect(() => {
    if (beat !== 'lines' || typed < line.length) return
    const t = setTimeout(() => {
      if (lineIdx < lines.length - 1) { setLineIdx(v => v + 1); setTyped(0) }
      else setBeat('choices')
    }, AUTO_ADVANCE_MS)
    return () => clearTimeout(t)
  }, [beat, typed, lineIdx, line, lines.length])

  const advanceLine = () => {
    if (beat !== 'lines') return
    sfx.click()
    if (typed < line.length) { setTyped(line.length); return }
    if (lineIdx < lines.length - 1) { setLineIdx(v => v + 1); setTyped(0) }
    else setBeat('choices')
  }

  // QTE 倒计时
  const deadline = useRef(0)
  useEffect(() => {
    if (beat !== 'choices' || !node.timer) return
    deadline.current = performance.now() + node.timer * 1000
    setTimeLeft(node.timer)
    const iv = setInterval(() => {
      const left = Math.max(0, (deadline.current - performance.now()) / 1000)
      setTimeLeft(left)
      if (left <= 3.05 && left > 0.1) { if (Math.abs(left % 1) < 0.06) sfx.heartbeat() }
      else if (left > 3) { if (Math.abs(left % 1) < 0.06) sfx.tick() }
      if (left <= 0) { clearInterval(iv); onTimeout() }
    }, 50)
    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat, nodeId])

  const g = useGame.getState

  const finishNode = () => {
    if (node.next) { g().enterNode(node.next); return }
    g().setPhase('flowchart')
  }

  // 谢幕渐黑后再执行切场，避免硬切
  const fadeOutThen = (after: () => void) => {
    setFading(true)
    setTimeout(after, FADE_OUT_MS)
  }

  const showConsequence = (text: string) => {
    if (!text) { fadeOutThen(finishNode); return }
    setConsequence(text)
    setBeat('consequence')
    sfx.whoosh()
    setTimeout(() => fadeOutThen(finishNode), CONSEQUENCE_MS)
  }

  const onTimeout = () => {
    if (!node.onTimeout || settled.current) return
    settled.current = true
    sfx.wrong()
    g().recordTimeout(node.id, node.onTimeout.regret)
    showConsequence(node.onTimeout.consequence)
  }

  const pick = (c: Choice) => {
    if (settled.current) return
    settled.current = true
    sfx.confirm()
    if (node.id === 'E') {
      g().applyChoice({ nodeId: 'E', choiceId: c.id, choiceText: c.text })
      if (c.id === 'E1') {
        g().chooseEnding(dominantEnding(g().stats), false)
        fadeOutThen(() => g().setPhase('flowchart'))
      } else {
        settled.current = false // 换门后还有一次选择（五扇门）
        setBeat('doors')
      }
      return
    }
    g().applyChoice(
      { nodeId: node.id, choiceId: c.id, choiceText: c.text },
      c.effect, c.boostDominant, c.regret,
    )
    showConsequence(c.consequence)
  }

  const pickDoor = (career: Career) => {
    if (settled.current) return
    settled.current = true
    sfx.confirm()
    g().chooseEnding(career, true)
    fadeOutThen(() => g().setPhase('flowchart'))
  }

  // 长按选择（D1 推门）：按住 HOLD_MS 确认，松手=退缩
  const holdRef = useRef<{ raf: number; t0: number; choice: Choice | null; hintT: number }>({ raf: 0, t0: 0, choice: null, hintT: 0 })
  const holdStart = (c: Choice) => {
    sfx.click()
    setHoldHint(false)
    holdRef.current.t0 = performance.now()
    holdRef.current.choice = c
    const step = () => {
      const pct = Math.min(1, (performance.now() - holdRef.current.t0) / HOLD_MS)
      setHoldPct(pct)
      if (pct >= 1) { holdEnd(true); return }
      holdRef.current.raf = requestAnimationFrame(step)
    }
    holdRef.current.raf = requestAnimationFrame(step)
  }
  const holdEnd = (complete = false) => {
    cancelAnimationFrame(holdRef.current.raf)
    const c = holdRef.current.choice
    holdRef.current.choice = null
    setHoldPct(0)
    // 松手时按实际按住时长兜底判定（rAF 只做视觉）
    const heldLongEnough = holdRef.current.t0 && performance.now() - holdRef.current.t0 >= HOLD_MS
    if ((complete || heldLongEnough) && c) { pick(c); return }
    // 短按/提前松手：明确告诉玩家这张卡要按住（否则在倒计时压力下会以为卡死）
    if (c) {
      sfx.tick()
      setHoldHint(true)
      clearTimeout(holdRef.current.hintT)
      holdRef.current.hintT = window.setTimeout(() => setHoldHint(false), 1600)
    }
  }
  useEffect(() => () => {
    cancelAnimationFrame(holdRef.current.raf)
    clearTimeout(holdRef.current.hintT)
  }, [])

  const timerPct = node.timer ? timeLeft / node.timer : 1
  const urgent = node.timer ? timeLeft <= 3 : false
  const R = 36, CIRC = 2 * Math.PI * R

  return (
    <div className={`scene scene-fade ${fading ? 'scene-out' : ''}`}
         onClick={advanceLine} data-testid={`node-${node.id}`}>
      <ParallaxStill url={still} dim={beat === 'consequence'} />
      <div key={node.id} className="light-sweep" aria-hidden />
      <div className="scene-tag">{node.age} · {node.place}</div>

      {beat === 'lines' && (
        <div className="subtitle-zone">
          <div className={`subtitle ${lineIdx >= node.lines.length ? 'echo' : ''}`}>
            {line.slice(0, typed)}
            <span className="caret" />
          </div>
          <div className="subtitle-hint">点 击 加 速</div>
        </div>
      )}

      {beat === 'choices' && (
        <>
          <div className="choice-prompt">{node.prompt}</div>
          {node.timer ? (
            <div className={`qte-ring ${urgent ? 'urgent' : ''}`}>
              <svg viewBox="0 0 84 84">
                <circle className="bg" cx="42" cy="42" r={R} fill="none" strokeWidth="4" />
                <circle
                  className="fg" cx="42" cy="42" r={R} fill="none" strokeWidth="4"
                  strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - timerPct)}
                />
              </svg>
              <div className="qte-num">{Math.ceil(timeLeft)}</div>
            </div>
          ) : null}
          <div className="choice-zone">
            {node.choices.map(c => c.hold ? (
              <button
                key={c.id} className={`choice-card hold-card ${holdHint ? 'hold-hint' : ''}`}
                data-testid={`choice-${c.id}`}
                style={{ ['--hold' as string]: holdPct }}
                onMouseEnter={() => sfx.hover()}
                onClick={e => e.stopPropagation()}
                onPointerDown={e => { e.stopPropagation(); holdStart(c) }}
                onPointerUp={() => holdEnd(false)}
                onPointerLeave={() => holdEnd(false)}
              >
                <div className="hold-fill" aria-hidden />
                <span className="hold-badge">按 住</span>
                <div className="t">{c.text}</div>
                {c.sub && <div className="s">{c.sub}</div>}
                {holdHint && <div className="hold-hint-text">松手太早了 —— 按住不放，直到门开</div>}
              </button>
            ) : (
              <button
                key={c.id} className="choice-card" data-testid={`choice-${c.id}`}
                onMouseEnter={() => sfx.hover()}
                onClick={e => { e.stopPropagation(); pick(c) }}
              >
                <div className="t">{c.text}</div>
                {c.sub && <div className="s">{c.sub}</div>}
              </button>
            ))}
          </div>
        </>
      )}

      {beat === 'doors' && (
        <>
          <div className="choice-prompt">五扇门重新亮起。走进——</div>
          <div className="choice-zone">
            {(Object.keys(CAREER_INFO) as Career[]).map(k => (
              <button
                key={k} className="choice-card" data-testid={`door-${k}`}
                onMouseEnter={() => sfx.hover()}
                onClick={e => { e.stopPropagation(); pickDoor(k) }}
              >
                <div className="t">{CAREER_INFO[k].name}的门</div>
                <div className="s">《{CAREER_INFO[k].title}》</div>
              </button>
            ))}
          </div>
        </>
      )}

      {beat === 'consequence' && (
        <div className="subtitle-zone">
          <div className="subtitle" style={{ color: '#d8cdb4' }}>{consequence}</div>
        </div>
      )}
    </div>
  )
}
