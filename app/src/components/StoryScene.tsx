import { useEffect, useRef, useState } from 'react'
import { useGame } from '../store'
import { NODES, CHAPTER_FLOW, Choice, Career, dominantCareer, CAREER_INFO } from '../story'
import { useStill } from './useStill'
import { sfx } from '../lib/audio'

type Beat = 'lines' | 'choices' | 'doors' | 'consequence'

export default function StoryScene() {
  const nodeId = useGame(s => s.nodeId)
  const node = NODES[nodeId]
  const still = useStill(node.still, node.palette, `${node.age}·${node.place}`)

  const [beat, setBeat] = useState<Beat>('lines')
  const [lineIdx, setLineIdx] = useState(0)
  const [typed, setTyped] = useState(0)
  const [consequence, setConsequence] = useState('')
  const [timeLeft, setTimeLeft] = useState(node.timer ?? 0)

  // 节点切换时复位
  useEffect(() => {
    setBeat('lines'); setLineIdx(0); setTyped(0)
    setConsequence(''); setTimeLeft(node.timer ?? 0)
  }, [nodeId])

  // 打字机
  const line = node.lines[lineIdx] ?? ''
  useEffect(() => {
    if (beat !== 'lines') return
    if (typed >= line.length) return
    const t = setTimeout(() => setTyped(v => v + 1), 65)
    return () => clearTimeout(t)
  }, [typed, beat, lineIdx, line])

  const advanceLine = () => {
    if (beat !== 'lines') return
    sfx.click()
    if (typed < line.length) { setTyped(line.length); return } // 先跳完本行
    if (lineIdx < node.lines.length - 1) { setLineIdx(v => v + 1); setTyped(0) }
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
    // E 节点在 pick/door 里单独处理，这里只处理 A-D
    if (node.next) { g().enterNode(node.next); return }
    // 章末
    const chIdx = CHAPTER_FLOW.findIndex(c => c.nodes.includes(node.id))
    g().setPhase('flowchart')
    // flowchart 组件负责推进到 enterChapter(chIdx+1) 或 career
    void chIdx
  }

  const showConsequence = (text: string) => {
    if (!text) { finishNode(); return }
    setConsequence(text)
    setBeat('consequence')
    sfx.whoosh()
    setTimeout(finishNode, 3600)
  }

  const onTimeout = () => {
    if (!node.onTimeout) return
    sfx.wrong()
    g().applyChoice(
      { nodeId: node.id, choiceId: 'timeout', choiceText: '……（犹豫）' },
      undefined, undefined, node.onTimeout.regret,
    )
    showConsequence(node.onTimeout.consequence)
  }

  const pick = (c: Choice) => {
    sfx.confirm()
    if (node.id === 'E') {
      g().applyChoice({ nodeId: 'E', choiceId: c.id, choiceText: c.text })
      if (c.id === 'E1') {
        g().chooseCareer(dominantCareer(g().stats), false)
        g().setPhase('flowchart')
      } else {
        setBeat('doors') // 换一扇门：显式三选
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
    sfx.confirm()
    g().chooseCareer(career, true)
    g().setPhase('flowchart')
  }

  const timerPct = node.timer ? timeLeft / node.timer : 1
  const urgent = node.timer ? timeLeft <= 3 : false
  const R = 36, CIRC = 2 * Math.PI * R

  return (
    <div className="scene scene-fade" onClick={advanceLine} data-testid={`node-${node.id}`}>
      <div
        className={`scene-still ${beat === 'consequence' ? 'consequence' : ''}`}
        style={{ backgroundImage: `url(${still})` }}
      />
      <div className="scene-tag">{node.age} · {node.place}</div>

      {beat === 'lines' && (
        <div className="subtitle-zone">
          <div className="subtitle">
            {line.slice(0, typed)}
            <span className="caret" />
          </div>
          <div className="subtitle-hint">点 击 继 续</div>
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
            {node.choices.map(c => (
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
          <div className="choice-prompt">三扇门重新亮起。走进——</div>
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
