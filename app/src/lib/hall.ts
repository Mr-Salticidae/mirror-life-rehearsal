// 今日人生墙：本机 localStorage 榜（展位离线可用）
export interface HallEntry {
  title: string      // 称号
  career: string     // 职业名
  rank: string       // S/A/B 或 —
  score: number
  ts: number
}

const KEY = 'mlr-hall-v1'
const MAX = 60

export function pushHall(e: Omit<HallEntry, 'ts'>) {
  try {
    const list = readAll()
    list.unshift({ ...e, ts: Date.now() })
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)))
  } catch { /* 存储不可用不影响主流程 */ }
}

export function todayHall(): HallEntry[] {
  const start = new Date(); start.setHours(0, 0, 0, 0)
  return readAll().filter(e => e.ts >= start.getTime())
}

function readAll(): HallEntry[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as HallEntry[]
  } catch { return [] }
}
