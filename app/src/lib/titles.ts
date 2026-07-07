// 称号池：5 职业 × S/A/B + 修饰词前缀（基准：content/五结局扩容计划_db.md 附录 A）
import { Ending } from '../story'
import { Rank } from '../store'

const POOL: Record<Ending, Record<Rank, string>> = {
  soldier:   { S: '风雪守夜人', A: '边线哨兵', B: '迷彩新兵' },
  painter:   { S: '执色者', A: '街巷画师', B: '喷罐学徒' },
  racer:     { S: '夜环线之王', A: '雨夜车手', B: '弯道新人' },
  musician:  { S: '躁动节拍', A: '地下回声', B: '卧室排练' },
  astronaut: { S: '仰望者', A: '失重旅人', B: '观星学徒' },
}

export function computeTitle(
  ending: Ending, rank: Rank | null,
  opts: { regret?: boolean; overridden?: boolean } = {},
): string {
  const base = POOL[ending][rank ?? 'B']
  if (opts.regret) return `带着遗憾的·${base}`
  if (opts.overridden) return `换过门的·${base}`
  return base
}

// 各游戏评级阈值（20s 版：fps/race/graffiti 按时长比例自原 60/90s 版缩放，纸面值待真人彩排校准）
export function rankOf(game: 'fps' | 'graffiti' | 'race' | 'rhythm' | 'dock', score: number): Rank {
  const t = {
    fps: { S: 50, A: 25 },        // 原 60s 版 140/70
    graffiti: { S: 4, A: 2 },     // 覆盖率百分比（原 90s 版 10/4）
    race: { S: 950, A: 800 },     // 米（实测零操作≈730m 定 B 上界；躲撞+氮气的熟练上限 ~1050m）
    rhythm: { S: 90, A: 70 },     // 命中率百分比（S 另要求连击 ≥36，见游戏内判定）
    dock: { S: 85, A: 60 },       // 对接综合分（60m 进近燃耗更省，S 略易，待彩排回调）
  }[game]
  return score >= t.S ? 'S' : score >= t.A ? 'A' : 'B'
}
