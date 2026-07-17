import { Component, ReactNode, useEffect, useState } from 'react'
import { useGame } from './store'
import { NODES, CAREER_INFO } from './story'
import { preloadStills, genderSuffix } from './components/useStill'
import AttractMode from './components/AttractMode'
import CloseupScene from './components/CloseupScene'
import Prologue from './components/Prologue'
import TitleCard from './components/TitleCard'
import StoryScene from './components/StoryScene'
import FlowChart from './components/FlowChart'
import CareerIntro from './components/CareerIntro'
import GameHost from './components/GameHost'
import EndingReport from './components/EndingReport'
import GrainLayer from './components/GrainLayer'
import { setMuted, isMuted } from './lib/audio'

// 错误边界：任何异常回待机，展会不许白屏
class Boundary extends Component<{ children: ReactNode }, { err: boolean }> {
  state = { err: false }
  static getDerivedStateFromError() { return { err: true } }
  componentDidCatch(e: unknown) {
    console.error('[boundary]', e)
    // 恢复动作放 didCatch（render 内不做副作用，避免重渲叠加多个定时器）
    setTimeout(() => { useGame.getState().toAttract(); this.setState({ err: false }) }, 50)
  }
  render() {
    if (this.state.err) return <div className="stage" />
    return this.props.children
  }
}

// 闲置回待机：非待机/游戏阶段 120s 无输入则复位
function useIdleReset() {
  const phase = useGame(s => s.phase)
  useEffect(() => {
    if (phase === 'attract' || phase === 'game') return
    let t = setTimeout(() => useGame.getState().toAttract(), 120_000)
    const bump = () => { clearTimeout(t); t = setTimeout(() => useGame.getState().toAttract(), 120_000) }
    const evs = ['pointerdown', 'pointermove', 'keydown'] as const
    evs.forEach(e => window.addEventListener(e, bump))
    return () => { clearTimeout(t); evs.forEach(e => window.removeEventListener(e, bump)) }
  }, [phase])
}

// 游戏阶段看门狗（无人值守兜底）：
// ① 60s 无任何输入（观众中途走人、开场层没人接手）→ 回待机；
// ② 单局绝对上限 180s（rAF 冻结/上下文丢失时输入还在但画面已死，输入计时救不了）→ 强制回待机。
// 正常一局 15s + 结算 3s，远够；两条线都只在 game 阶段生效。
function useGameWatchdog() {
  const phase = useGame(s => s.phase)
  useEffect(() => {
    if (phase !== 'game') return
    const reset = () => useGame.getState().toAttract()
    const hard = setTimeout(reset, 180_000)
    let idle = setTimeout(reset, 60_000)
    const bump = () => { clearTimeout(idle); idle = setTimeout(reset, 60_000) }
    const evs = ['pointerdown', 'pointermove', 'keydown'] as const
    evs.forEach(e => window.addEventListener(e, bump))
    return () => {
      clearTimeout(hard); clearTimeout(idle)
      evs.forEach(e => window.removeEventListener(e, bump))
    }
  }, [phase])
}

// 运维直达：?career=五职业之一 跳过叙事直进职业线（展位调试用）
const CAREERS = ['soldier', 'painter', 'racer', 'musician', 'astronaut'] as const
function useDevJump() {
  useEffect(() => {
    const c = new URLSearchParams(location.search).get('career')
    if ((CAREERS as readonly string[]).includes(c ?? '')) {
      const g = useGame.getState()
      g.start()
      g.chooseEnding(c as (typeof CAREERS)[number], false)
      g.setPhase('career-intro')
    }
  }, [])
}

// 全部剧照：叙事节点在前（最先用到），职业前奏/结局/涂鸦墙其后
const ALL_STILLS = [
  ...Object.values(NODES).map(n => n.still),
  ...Object.values(CAREER_INFO).flatMap(c => [c.introStill, c.endStill]),
  'wall',
]

export default function App() {
  const phase = useGame(s => s.phase)
  const [muted, setM] = useState(isMuted())
  useIdleReset()
  useGameWatchdog()
  useDevJump()
  // 待机页起预热全部剧照，入场首帧直出真图（不再闪占位底图）
  useEffect(() => { preloadStills(ALL_STILLS) }, [])
  // 选完性别立刻预热该性别的变体剧照（只覆盖部分位置，缺失的探一次 404 记账即止）
  const gender = useGame(s => s.gender)
  useEffect(() => {
    const sfx = genderSuffix(gender)
    if (sfx) preloadStills(ALL_STILLS.map(id => `${id}_${sfx}`))
  }, [gender])

  const inCinema = phase !== 'attract' && phase !== 'game' && phase !== 'report'

  return (
    <Boundary>
      <div className={`stage letterbox ${inCinema ? '' : 'lb-off'}`}>
        {phase === 'attract' && <AttractMode />}
        {phase === 'closeup' && <CloseupScene />}
        {phase === 'prologue' && <Prologue />}
        {phase === 'chapter' && <TitleCard />}
        {phase === 'story' && <StoryScene />}
        {phase === 'flowchart' && <FlowChart mode="interlude" />}
        {phase === 'career-intro' && <CareerIntro />}
        {phase === 'game' && <GameHost />}
        {phase === 'report' && <EndingReport />}

        <GrainLayer />
        <div className="vignette" />
        <div className="top-bar">
          <span>MIRROR LIFE REHEARSAL</span>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span>INTERACTIVE FILM · 互动影游</span>
            <button onClick={() => { setMuted(!muted); setM(!muted) }}>
              声音 {muted ? '关' : '开'}
            </button>
          </div>
        </div>
      </div>
    </Boundary>
  )
}
