import { Rank } from '../store'

// 统一评级结算演出：S/A/B 大字砸屏
const VERDICT: Record<Rank, string> = {
  S: '无 可 挑 剔',
  A: '相 当 出 色',
  B: '还 有 明 天',
}

export default function RankSplash({ rank, title, sub }: { rank: Rank; title: string; sub: string }) {
  return (
    <div className="rank-splash" data-testid="rank-splash">
      <div className="verdict">{title}</div>
      <div className={`grade ${rank}`}>{rank}</div>
      <div className="sub">{VERDICT[rank]} · {sub}</div>
    </div>
  )
}
