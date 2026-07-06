import { useEffect, useMemo } from 'react'
import { useGame } from '../store'
import { NODES, CHAPTER_FLOW, CAREER_INFO, Career } from '../story'
import { sfx } from '../lib/audio'

const GOLD = '#d8b878'
const DIM = '#3a4050'
const DIM_TEXT = '#5a5f6e'

// 底特律式分支图：走过的路径点亮，没走的灰显加锁
export default function FlowChart({ mode }: { mode: 'interlude' | 'final' }) {
  const path = useGame(s => s.path)
  const career = useGame(s => s.career)
  const g = useGame.getState

  const doneNodes = useMemo(() => new Set(path.map(p => p.nodeId)), [path])
  const chosen = useMemo(() => new Map(path.map(p => [p.nodeId, p.choiceId])), [path])

  // interlude 模式：展示后自动推进
  const proceed = () => {
    if (career) { g().setPhase('career-intro'); return }
    const nextCh = CHAPTER_FLOW.findIndex(c => !c.nodes.every(n => doneNodes.has(n)))
    g().enterChapter(nextCh === -1 ? CHAPTER_FLOW.length - 1 : nextCh)
  }
  useEffect(() => {
    if (mode !== 'interlude') return
    sfx.whoosh()
    const t = setTimeout(proceed, 5000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 布局
  const order = ['A', 'B', 'C', 'D', 'E']
  const visible = mode === 'final' ? order : order.filter(id => doneNodes.has(id))
  const W = 1200, H = 560, SPINE = H / 2
  const startX = 90, gapX = (W - 200) / Math.max(order.length - 1, 1)
  const nx = (i: number) => startX + i * gapX

  const svg = (
    <svg viewBox={`0 0 ${W} ${H}`}>
      {/* 主线 */}
      {visible.length > 1 && (
        <line x1={nx(order.indexOf(visible[0]))} y1={SPINE}
              x2={nx(order.indexOf(visible[visible.length - 1]))} y2={SPINE}
              stroke={GOLD} strokeWidth="2" opacity="0.85">
          <animate attributeName="opacity" from="0" to="0.85" dur="1.2s" />
        </line>
      )}

      {order.map((id, i) => {
        const node = NODES[id]
        const isDone = doneNodes.has(id)
        const isVisible = mode === 'final' || isDone
        if (!isVisible) return null
        const x = nx(i)
        // 选项分支的纵向扇形位（避开主线，上下错开）
        const nCh = node.choices.length + (node.onTimeout ? 1 : 0)
        const finalYs = nCh === 2 ? [SPINE - 120, SPINE + 120]
          : nCh === 3 ? [SPINE - 170, SPINE - 95, SPINE + 130]
          : [SPINE - 190, SPINE - 105, SPINE + 105, SPINE + 190]

        const allChoices = [
          ...node.choices.map(c => ({ id: c.id, text: c.text })),
          ...(node.onTimeout ? [{ id: 'timeout', text: '……（犹豫）' }] : []),
        ]
        const taken = chosen.get(id)

        return (
          <g key={id}>
            {/* 节点 */}
            <circle cx={x} cy={SPINE} r="9" fill={isDone ? GOLD : '#11141c'}
                    stroke={isDone ? GOLD : DIM} strokeWidth="2" />
            <text className={`fc-node-label ${isDone ? '' : 'locked'}`} x={x} y={SPINE + 34}
                  textAnchor="middle">{node.age}·{node.place}</text>

            {/* 选项分支 */}
            {allChoices.map((c, j) => {
              const cy = finalYs[j] ?? SPINE - 150 + j * 100
              const cx = x + gapX * 0.42
              const isTaken = taken === c.id
              const known = isTaken // 只有走过的分支显示内容
              const col = isTaken ? GOLD : DIM
              return (
                <g key={c.id} opacity={isDone || mode === 'final' ? 1 : 0.4}>
                  <path d={`M ${x} ${SPINE} C ${x + gapX * 0.2} ${SPINE}, ${x + gapX * 0.2} ${cy}, ${cx} ${cy}`}
                        fill="none" stroke={col} strokeWidth={isTaken ? 2.5 : 1.2}
                        strokeDasharray={isTaken ? 'none' : '4 5'} opacity={isTaken ? 0.95 : 0.55} />
                  {isTaken
                    ? <circle cx={cx} cy={cy} r="5.5" fill={GOLD} />
                    : <g>
                        <circle cx={cx} cy={cy} r="5.5" fill="#11141c" stroke={DIM} strokeWidth="1.5" />
                        <text x={cx} y={cy + 3.6} textAnchor="middle" fontSize="8" fill={DIM_TEXT}>?</text>
                      </g>}
                  <text className="fc-choice-label" x={cx + 12} y={cy + 4}
                        fill={known ? '#cfc4a8' : DIM_TEXT}>
                    {known ? c.text : '？？？'}
                  </text>
                  {/* 走过的分支汇回主线 */}
                  {isTaken && i < order.length - 1 && (doneNodes.has(order[i + 1]) || mode === 'final') && (
                    <path d={`M ${cx} ${cy} C ${x + gapX * 0.7} ${cy}, ${x + gapX * 0.7} ${SPINE}, ${nx(i + 1)} ${SPINE}`}
                          fill="none" stroke={GOLD} strokeWidth="2" opacity="0.7" />
                  )}
                </g>
              )
            })}
          </g>
        )
      })}

      {/* 终点：三种人生（E 完成后或 final 模式） */}
      {(career || mode === 'final') && (
        <g>
          {(Object.keys(CAREER_INFO) as Career[]).map((k, j) => {
            const y = SPINE - 120 + j * 120
            const x = W - 60
            const on = career === k
            return (
              <g key={k}>
                <path d={`M ${nx(order.length - 1)} ${SPINE} C ${W - 150} ${SPINE}, ${W - 150} ${y}, ${x - 34} ${y}`}
                      fill="none" stroke={on ? GOLD : DIM} strokeWidth={on ? 2.5 : 1.2}
                      strokeDasharray={on ? 'none' : '4 5'} opacity={on ? 0.95 : 0.5} />
                <rect x={x - 34} y={y - 16} width="68" height="32" rx="3"
                      fill={on ? 'rgba(216,184,120,.16)' : '#11141c'}
                      stroke={on ? GOLD : DIM} strokeWidth={on ? 1.5 : 1} />
                <text x={x} y={y + 5} textAnchor="middle" fontSize="13"
                      fill={on ? '#f0e0b8' : DIM_TEXT} letterSpacing="2">
                  {CAREER_INFO[k].name}
                </text>
              </g>
            )
          })}
        </g>
      )}
    </svg>
  )

  if (mode === 'final') {
    return <div className="report-flow">{svg}</div>
  }
  return (
    <div className="flowchart" data-testid="flowchart">
      <h3>人生轨迹</h3>
      {svg}
      <button className="skip" onClick={proceed}>继 续 ▸</button>
    </div>
  )
}
