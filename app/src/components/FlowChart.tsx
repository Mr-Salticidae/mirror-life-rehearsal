import { useEffect, useMemo } from 'react'
import { useGame } from '../store'
import { NODES, CHAPTER_FLOW, CAREER_INFO, Career } from '../story'
import { sfx } from '../lib/audio'

const GOLD = '#d8b878'
const DIM = '#3a4050'
const DIM_TEXT = '#5a5f6e'

// Catmull-Rom → 贝塞尔：让人生曲线平滑穿过每个锚点（节点处带势能斜穿，选项点自然成波峰/谷）
function catmullPath(p: [number, number][]): string {
  if (p.length < 2) return ''
  let d = `M ${p[0][0]} ${p[0][1]}`
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] ?? p2
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0]} ${p2[1]}`
  }
  return d
}

// 底特律式分支图：走过的路径点亮，没走的灰显加锁
export default function FlowChart({ mode }: { mode: 'interlude' | 'final' }) {
  const path = useGame(s => s.path)
  const ending = useGame(s => s.ending)
  const g = useGame.getState

  const doneNodes = useMemo(() => new Set(path.map(p => p.nodeId)), [path])
  const chosen = useMemo(() => new Map(path.map(p => [p.nodeId, p.choiceId])), [path])

  // interlude 模式：展示后自动推进
  const proceed = () => {
    if (ending) { g().setPhase('career-intro'); return }
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
  const order = ['A', 'B', 'F', 'C', 'G', 'D', 'H', 'E']
  const visible = mode === 'final' ? order : order.filter(id => doneNodes.has(id))
  const W = 1200, H = 560, SPINE = H / 2
  const startX = 90, gapX = (W - 200) / Math.max(order.length - 1, 1)
  const nx = (i: number) => startX + i * gapX

  // 选项分支的纵向扇形位（避开主线，上下错开）——节点渲染与人生曲线共用
  const branchYs = (nCh: number) =>
    nCh === 2 ? [SPINE - 120, SPINE + 120]
      : nCh === 3 ? [SPINE - 170, SPINE - 95, SPINE + 130]
      : [SPINE - 190, SPINE - 105, SPINE + 105, SPINE + 190]
  const nodeChoices = (id: string) => {
    const node = NODES[id]
    return [
      ...node.choices.map(c => ({ id: c.id, text: c.text })),
      ...(node.onTimeout ? [{ id: 'timeout', text: '……（犹豫）' }] : []),
    ]
  }

  // 人生曲线（主导定案）：从第一个节点出发后，只跟随选中项游动——
  // 全选上层则一路在上层，不折回主轴；上下切换时才自然穿越主轴
  const lifePts: [number, number][] = []
  const firstDone = visible.find(id => doneNodes.has(id))
  if (firstDone) lifePts.push([nx(order.indexOf(firstDone)), SPINE])
  for (const id of visible) {
    const t = chosen.get(id)
    if (!doneNodes.has(id) || !t) continue
    const i = order.indexOf(id)
    const all = nodeChoices(id)
    const j = all.findIndex(c => c.id === t)
    if (j >= 0) lifePts.push([nx(i) + gapX * 0.42, branchYs(all.length)[j] ?? SPINE - 150 + j * 100])
  }
  // 终点：金线直接游进选中的结局框（不再借道主轴上的 E 节点）
  const curveIntoEnding = !!ending && lifePts.length >= 2
  if (curveIntoEnding) {
    const j = (Object.keys(CAREER_INFO) as Career[]).indexOf(ending!)
    lifePts.push([W - 60 - 34, SPINE - 190 + j * 95])
  }
  const lifePath = catmullPath(lifePts)

  const svg = (
    <svg viewBox={`0 0 ${W} ${H}`}>
      {/* 人生曲线 */}
      {lifePath && (
        <path d={lifePath} fill="none" stroke={GOLD} strokeWidth="2.5"
              strokeLinecap="round" opacity="0.9">
          <animate attributeName="opacity" from="0" to="0.9" dur="1.2s" />
        </path>
      )}

      {order.map((id, i) => {
        const node = NODES[id]
        const isDone = doneNodes.has(id)
        const isVisible = mode === 'final' || isDone
        if (!isVisible) return null
        const x = nx(i)
        const allChoices = nodeChoices(id)
        const finalYs = branchYs(allChoices.length)
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
                  {/* 选中分支不再单独画岔线——人生曲线本身会穿过选项点 */}
                  {!isTaken && (
                    <path d={`M ${x} ${SPINE} C ${x + gapX * 0.2} ${SPINE}, ${x + gapX * 0.2} ${cy}, ${cx} ${cy}`}
                          fill="none" stroke={col} strokeWidth="1.2"
                          strokeDasharray="4 5" opacity="0.55" />
                  )}
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
                </g>
              )
            })}
          </g>
        )
      })}

      {/* 终点：五种人生 */}
      {(ending || mode === 'final') && (
        <g>
          {(Object.keys(CAREER_INFO) as Career[]).map((k, j) => {
            const y = SPINE - 190 + j * 95
            const x = W - 60
            const on = ending === k
            return (
              <g key={k}>
                {/* 人生曲线已直接游进选中结局框时，不再画借道 E 节点的连线 */}
                {!(on && curveIntoEnding) && (
                  <path d={`M ${nx(order.length - 1)} ${SPINE} C ${W - 150} ${SPINE}, ${W - 150} ${y}, ${x - 34} ${y}`}
                        fill="none" stroke={on ? GOLD : DIM} strokeWidth={on ? 2.5 : 1.2}
                        strokeDasharray={on ? 'none' : '4 5'} opacity={on ? 0.95 : 0.5} />
                )}
                <rect x={x - 34} y={y - 15} width="68" height="30" rx="3"
                      fill={on ? 'rgba(216,184,120,.16)' : '#11141c'}
                      stroke={on ? GOLD : DIM} strokeWidth={on ? 1.5 : 1} />
                <text x={x} y={y + 5} textAnchor="middle" fontSize="12.5"
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
