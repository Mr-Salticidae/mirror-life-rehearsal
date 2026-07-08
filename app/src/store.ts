import { create } from 'zustand'
import { Ending, Stat, dominantStat } from './story'

export type Phase =
  | 'attract'      // 待机吸引模式
  | 'prologue'     // 序幕：擦亮镜子
  | 'chapter'      // 章节标题卡
  | 'story'        // 抉择节点
  | 'flowchart'    // 章间分支图
  | 'career-intro' // 职业前奏
  | 'game'         // 迷你游戏
  | 'report'       // 终幕报告

export type Rank = 'S' | 'A' | 'B'

export type Gender = 'male' | 'female'

export interface PathStep { nodeId: string; choiceId: string; choiceText: string }

interface GameState {
  phase: Phase
  nodeId: string
  chapterIndex: number
  stats: Record<Stat, number>
  path: PathStep[]
  regret: boolean
  timeouts: number           // 犹豫（超时）次数，进报告文案
  ending: Ending | null
  overridden: boolean        // E 节点换过门
  gameScore: number
  gameRank: Rank | null
  gameDetail: string
  graffitiData: string | null
  gender: Gender | null      // 入口选的男/女，带入整段预演

  start(gender?: Gender): void
  toAttract(): void
  setPhase(p: Phase): void
  enterChapter(i: number): void
  enterNode(id: string): void
  applyChoice(step: PathStep, effect?: Partial<Record<Stat, number>>, boostDominant?: number, regret?: boolean): void
  recordTimeout(nodeId: string, regret?: boolean): void
  chooseEnding(e: Ending, overridden: boolean): void
  finishGame(score: number, detail: string, rank: Rank): void
  retryGame(): void
  setGraffiti(d: string): void
}

const initialStats = (): Record<Stat, number> =>
  ({ guard: 0, create: 0, swift: 0, rhythm: 0, far: 0 })

export const useGame = create<GameState>((set, get) => ({
  phase: 'attract',
  nodeId: 'A',
  chapterIndex: 0,
  stats: initialStats(),
  path: [],
  regret: false,
  timeouts: 0,
  ending: null,
  overridden: false,
  gameScore: 0,
  gameRank: null,
  gameDetail: '',
  graffitiData: null,
  gender: null,

  start: (gender?: Gender) => set({
    phase: 'prologue', nodeId: 'A', chapterIndex: 0,
    stats: initialStats(), path: [], regret: false, timeouts: 0, ending: null,
    overridden: false, gameScore: 0, gameRank: null, gameDetail: '', graffitiData: null,
    gender: gender ?? null,
  }),
  toAttract: () => set({ phase: 'attract', gender: null }),
  setPhase: (p) => set({ phase: p }),
  enterChapter: (i) => set({ chapterIndex: i, phase: 'chapter' }),
  enterNode: (id) => set({ nodeId: id, phase: 'story' }),
  applyChoice: (step, effect, boostDominant, regret) => {
    const s = { ...get().stats }
    if (effect) for (const k of Object.keys(effect) as Stat[]) s[k] += effect[k] ?? 0
    if (boostDominant) s[dominantStat(s)] += boostDominant
    set({
      stats: s,
      path: [...get().path, step],
      regret: get().regret || !!regret,
    })
  },
  recordTimeout: (nodeId, regret) => set({
    timeouts: get().timeouts + 1,
    path: [...get().path, { nodeId, choiceId: 'timeout', choiceText: '……（犹豫）' }],
    regret: get().regret || !!regret,
  }),
  chooseEnding: (e, overridden) => set({ ending: e, overridden }),
  finishGame: (score, detail, rank) => set({ gameScore: score, gameDetail: detail, gameRank: rank, phase: 'report' }),
  // 再试一次：保留叙事轨迹与结局，只重开职业游戏刷分（P1·刷分入口）
  retryGame: () => set({ gameScore: 0, gameRank: null, gameDetail: '', phase: 'game' }),
  setGraffiti: (d) => set({ graffitiData: d }),
}))
