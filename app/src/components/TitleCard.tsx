import { useEffect } from 'react'
import { useGame } from '../store'
import { CHAPTER_FLOW, NODES } from '../story'
import { sfx } from '../lib/audio'

const CH_NUM = ['壹', '贰', '叁']

export default function TitleCard() {
  const chapterIndex = useGame(s => s.chapterIndex)
  const enterNode = useGame(s => s.enterNode)
  const flow = CHAPTER_FLOW[chapterIndex]
  const first = NODES[flow.nodes[0]]

  useEffect(() => {
    sfx.whoosh()
    const t = setTimeout(() => enterNode(flow.nodes[0]), 3400)
    return () => clearTimeout(t)
  }, [chapterIndex])

  return (
    <div className="title-card">
      <div className="ch">CHAPTER {CH_NUM[chapterIndex]}</div>
      <div className="big">{first.age}</div>
      <div className="line" />
    </div>
  )
}
