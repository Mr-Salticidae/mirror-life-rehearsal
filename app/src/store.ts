import { create } from 'zustand'
import { Career, Stat, dominantCareer } from './story'

export type Phase =
  | 'attract'      // 待机吸引模式
  | 'prologue'     // 序幕：点亮镜子
  | 'chapter'      // 章节标题卡
  | 'story'        // 抉择节点
  | 'flowchart'    // 章间分支图
  | 'career-intro' // 职业前奏
  | 'game'         // 迷你游戏
  | 'report'       // 终幕报告

export interface PathStep { nodeId: string; choiceId: string; choiceText: string }

interface GameState {
  phase: Phase
  nodeId: string
  chapterIndex: number       // 0..2，进入哪一章
  stats: Record<Stat, number>
  path: PathStep[]
  regret: boolean
  career: Career | null
  overridden: boolean        // E 节点换过门
  gameScore: number
  gameDetail: string         // 游戏结算描述，供报告
  graffitiData: string | null // 涂鸦作品 dataURL，合成进结局

  start(): void
  toAttract(): void
  setPhase(p: Phase): void
  enterChapter(i: number): void
  enterNode(id: string): void
  applyChoice(step: PathStep, effect?: Partial<Record<Stat, number>>, boostDominant?: number, regret?: boolean): void
  chooseCareer(c: Career, overridden: boolean): void
  finishGame(score: number, detail: string): void
  setGraffiti(d: string): void
}

const initialStats = (): Record<Stat, number> => ({ brave: 0, color: 0, speed: 0 })

export const useGame = create<GameState>((set, get) => ({
  phase: 'attract',
  nodeId: 'A',
  chapterIndex: 0,
  stats: initialStats(),
  path: [],
  regret: false,
  career: null,
  overridden: false,
  gameScore: 0,
  gameDetail: '',
  graffitiData: null,

  start: () => set({
    phase: 'prologue', nodeId: 'A', chapterIndex: 0,
    stats: initialStats(), path: [], regret: false, career: null,
    overridden: false, gameScore: 0, gameDetail: '', graffitiData: null,
  }),
  toAttract: () => set({ phase: 'attract' }),
  setPhase: (p) => set({ phase: p }),
  enterChapter: (i) => set({ chapterIndex: i, phase: 'chapter' }),
  enterNode: (id) => set({ nodeId: id, phase: 'story' }),
  applyChoice: (step, effect, boostDominant, regret) => {
    const s = { ...get().stats }
    if (effect) for (const k of Object.keys(effect) as Stat[]) s[k] += effect[k] ?? 0
    if (boostDominant) {
      const c = dominantCareer(s)
      const key: Stat = c === 'soldier' ? 'brave' : c === 'painter' ? 'color' : 'speed'
      s[key] += boostDominant
    }
    set({
      stats: s,
      path: [...get().path, step],
      regret: get().regret || !!regret,
    })
  },
  chooseCareer: (c, overridden) => set({ career: c, overridden }),
  finishGame: (score, detail) => set({ gameScore: score, gameDetail: detail, phase: 'report' }),
  setGraffiti: (d) => set({ graffitiData: d }),
}))
