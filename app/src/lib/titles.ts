// 称号池：职业 × 评级 + 修饰词前缀 + 无名者
import { Ending } from '../story'
import { Rank } from '../store'

const POOL: Record<Exclude<Ending, 'drifter'>, Record<Rank, string>> = {
  soldier: { S: '风雪守夜人', A: '边线哨兵', B: '迷彩新兵' },
  painter: { S: '执色者', A: '街巷画师', B: '喷罐学徒' },
  racer:   { S: '夜环线之王', A: '雨夜车手', B: '弯道新人' },
}

export function computeTitle(
  ending: Ending, rank: Rank | null,
  opts: { regret?: boolean; overridden?: boolean } = {},
): string {
  if (ending === 'drifter') return '无名者'
  const base = POOL[ending][rank ?? 'B']
  if (opts.regret) return `带着遗憾的·${base}`
  if (opts.overridden) return `换过门的·${base}`
  return base
}

// 各游戏评级阈值
export function rankOf(game: 'fps' | 'graffiti' | 'race', score: number): Rank {
  const t = {
    fps: { S: 140, A: 70 },
    graffiti: { S: 10, A: 4 },   // 覆盖率百分比
    race: { S: 1650, A: 1350 },  // 米
  }[game]
  return score >= t.S ? 'S' : score >= t.A ? 'A' : 'B'
}
