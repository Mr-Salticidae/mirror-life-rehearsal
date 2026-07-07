// 报告推导层：从五维原始分推导 4 轴/类型代码/印记/未走人生
// 展台报告页（EndingReport）与手机扫码报告页（mobile/）共用，保证两端结论一致
import { CAREER_INFO, Career, Stat, MAX_REACH } from '../story'

// 结局印记：路线里第二强的倾向 = "你是哪一种{职业}"，决定海报变体剧照与印记文案
// 变体图命名 end_{career}_{trait}.jpg（素材未落位时自动回退基础结局图，随放随生效）
export const TRAIT_FLAVOR: Record<Stat, { label: string; line: string }> = {
  guard:  { label: '守望型', line: '把别人的安全，排在自己前面。' },
  create: { label: '造梦型', line: '规则之外，总能画出另一条路。' },
  swift:  { label: '疾风型', line: '等不及世界慢慢来。' },
  rhythm: { label: '律动型', line: '心里始终有一支不停的拍子。' },
  far:    { label: '远望型', line: '看的从来不是眼前这一步。' },
}
export const OWN_STAT: Record<Career, Stat> = {
  soldier: 'guard', painter: 'create', racer: 'swift', musician: 'rhythm', astronaut: 'far',
}

// 五维在扫码载荷里的固定序（s 数组按此排列）
export const STAT_ORDER: Stat[] = ['guard', 'create', 'swift', 'rhythm', 'far']

// GPTI 式 4 轴（基准：content/五结局扩容计划_db.md 附录 C/D）
export interface Axis { name: string; l: string; r: string; letters: [string, string]; pct: number }
export function computeAxes(s: Record<Stat, number>): { axes: Axis[]; typeCode: string } {
  const defs: Array<Omit<Axis, 'pct'> & { L: number; R: number }> = [
    { name: '核心驱动', l: '守', r: '创', letters: ['G', 'C'], L: s.guard, R: s.create + s.swift + s.rhythm + s.far },
    { name: '目光所向', l: '远', r: '近', letters: ['F', 'N'], L: s.swift + s.far, R: s.guard + s.create + s.rhythm },
    { name: '与世界的距离', l: '群', r: '独', letters: ['T', 'S'], L: s.guard + s.rhythm, R: s.create + s.swift + s.far },
    { name: '生命节奏', l: '疾', r: '缓', letters: ['V', 'R'], L: s.swift + s.rhythm, R: s.guard + s.create + s.far },
  ]
  const axes = defs.map(d => ({
    name: d.name, l: d.l, r: d.r, letters: d.letters,
    pct: d.L + d.R > 0 ? Math.round((d.L / (d.L + d.R)) * 100) : 50,
  }))
  const typeCode = axes.map(a => (a.pct >= 50 ? a.letters[0] : a.letters[1])).join('')
  return { axes, typeCode }
}

// 次强倾向（归一化后除本命外最高、且 >0），决定变体剧照与印记
export function computeVariantTrait(stats: Record<Stat, number>, ending: Career): Stat | null {
  const cands = STAT_ORDER
    .filter(st => st !== OWN_STAT[ending])
    .map(st => ({ st, score: stats[st] / Math.sqrt(MAX_REACH[st]) }))
    .filter(a => a.score > 0) // 运维直达全 0 → 无印记，走基础图
    .sort((a, b) => b.score - a.score)
  return cands[0]?.st ?? null
}

// 镜子没给你的人生：归一化第 2/3 高的维度对应职业
export function computeAltLives(stats: Record<Stat, number>, ending: Career) {
  const order: [Stat, Career][] = [
    ['guard', 'soldier'], ['create', 'painter'], ['swift', 'racer'],
    ['rhythm', 'musician'], ['far', 'astronaut'],
  ]
  return order
    .filter(([, c]) => c !== ending)
    .map(([st, c]) => ({ c, score: stats[st] / Math.sqrt(MAX_REACH[st]) }))
    .filter(a => a.score > 0) // 0 分维度不算"差点走上的路"（运维直达时全 0，整节隐藏）
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map(({ c }) => ({ name: CAREER_INFO[c].name, slogan: CAREER_INFO[c].slogan }))
}
