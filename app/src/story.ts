// 《镜像自我·人生预演》分支剧本数据
// 三条职业线：军人(brave 勇) / 画家(color 彩) / 赛车手(speed 驰)

export type Career = 'soldier' | 'painter' | 'racer'
export type Stat = 'brave' | 'color' | 'speed'

export interface Choice {
  id: string
  text: string
  sub?: string            // 选项副文本（小字）
  effect?: Partial<Record<Stat, number>>
  boostDominant?: number  // 给当前最高倾向加值（D节点“坚持”）
  regret?: boolean        // 记遗憾 flag
  consequence: string     // 选择后的一句后果文本（同剧照色调变化中显示）
}

export interface StoryNode {
  id: string
  chapter: number         // 1..3
  chapterTitle: string    // 章节标题卡
  age: string             // “七岁”
  place: string           // “巷口”
  still: string           // 剧照 id → /stills/{id}.jpg
  palette: [string, string, string] // 占位图渐变色（无剧照时程序化生成）
  lines: string[]         // 进入场景后的字幕（逐条打字机）
  prompt: string          // 抉择提示语
  timer?: number          // 秒；有值则为限时 QTE
  onTimeout?: { consequence: string; regret?: boolean } // 超时=犹豫，也是一种选择
  choices: Choice[]
  next: string | null     // 下一节点 id；null = 章末
}

export const CAREER_INFO: Record<Career, {
  name: string; title: string; game: string; gameHint: string
  introStill: string; endStill: string
  introLines: string[]
  palette: [string, string, string]
}> = {
  soldier: {
    name: '军人', title: '守夜', game: 'fps',
    gameHint: '鼠标瞄准 · 点击射击 · 红色为标靶 · 白色为平民，误伤扣分',
    introStill: 'career_soldier', endStill: 'end_soldier',
    introLines: [
      '二十六岁，你在边境哨所度过第四个冬天。',
      '今夜风雪很大，轮到你守夜。',
      '远处传来动静——考核开始了。',
    ],
    palette: ['#0a1420', '#1d3a52', '#7fb4d8'],
  },
  painter: {
    name: '画家', title: '一面墙', game: 'graffiti',
    gameHint: '按住鼠标喷涂 · 下方切换颜色 · 这面墙是你的',
    introStill: 'career_painter', endStill: 'end_painter',
    introLines: [
      '二十六岁，你的画没能进美术馆。',
      '但城市给了你更大的展厅。',
      '凌晨四点，这面墙在等你。',
    ],
    palette: ['#1a1026', '#43245e', '#c99df0'],
  },
  racer: {
    name: '赛车手', title: '夜环线', game: 'race',
    gameHint: '← → 或 A D 转向 · 躲开车流 · 蓝色光点是氮气',
    introStill: 'career_racer', endStill: 'end_racer',
    introLines: [
      '二十六岁，你终于攒够了改装费。',
      '雨夜的环线空无一人。',
      '引擎在等你把油门踩下去。',
    ],
    palette: ['#03060f', '#12233f', '#4f8fe8'],
  },
}

export const NODES: Record<string, StoryNode> = {
  A: {
    id: 'A', chapter: 1, chapterTitle: '第一章 · 七岁', age: '七岁', place: '巷口',
    still: 'node_a', palette: ['#2b1a10', '#7a4a24', '#f0b46a'],
    lines: [
      '七岁的夏天很长，长得像不会结束。',
      '放学路上，你在巷口停了下来。',
      '有三样东西，同时抓住了你的眼睛。',
    ],
    prompt: '你多看了一眼——',
    choices: [
      { id: 'A1', text: '墙上那幅没画完的涂鸦', sub: '颜色在夕阳里发烫', effect: { color: 2 },
        consequence: '你伸手碰了碰墙上的颜料。那天之后，你的课本边角再也没有空白过。' },
      { id: 'A2', text: '巷尾飞驰而过的自行车少年', sub: '车轮卷起一阵风', effect: { speed: 2 },
        consequence: '风从耳边过去的声音，你记了很多年。' },
      { id: 'A3', text: '电器行电视里的阅兵直播', sub: '脚步声整齐得像一个人', effect: { brave: 2 },
        consequence: '你在玻璃橱窗前站得笔直，站到天黑。' },
    ],
    next: 'B',
  },
  B: {
    id: 'B', chapter: 1, chapterTitle: '第一章 · 七岁', age: '七岁', place: '作文课',
    still: 'node_b', palette: ['#1c2416', '#4a5e30', '#c8d89a'],
    lines: [
      '作文课，题目写在黑板上：《我的梦想》。',
      '老师从最后一排开始，一个一个往前收。',
      '你的格子纸还空着。',
    ],
    prompt: '老师快走到你桌前了，你落笔——',
    timer: 8,
    onTimeout: { consequence: '纸被收走了，格子还空着。有些答案，要等很多年才敢写。' },
    choices: [
      { id: 'B1', text: '不写字，画满整页', sub: '梦想没法用字写', effect: { color: 1 },
        consequence: '老师举着你的“作文”看了很久，没有批评你。' },
      { id: 'B2', text: '“我要开最快的车”', sub: '一行字，笔画很用力', effect: { speed: 1 },
        consequence: '同桌笑了。你没笑。' },
      { id: 'B3', text: '“我要保护别人”', sub: '字写得方方正正', effect: { brave: 1 },
        consequence: '这五个字后来你又写过一次，在一张志愿表上。' },
    ],
    next: null,
  },
  C: {
    id: 'C', chapter: 2, chapterTitle: '第二章 · 十七岁', age: '十七岁', place: '天台',
    still: 'node_c', palette: ['#26160e', '#8a4a2a', '#f5c890'],
    lines: [
      '高三，晚自习前的天台。',
      '最好的朋友把可乐递给你：',
      '“说真的，你以后到底想干嘛？”',
    ],
    prompt: '你从书包里掏出了那张藏了很久的——',
    choices: [
      { id: 'C1', text: '美术集训班的招生单', sub: '折了又折，边都软了', effect: { color: 2 },
        consequence: '“学费我自己想办法。”你听见自己说。' },
      { id: 'C2', text: '军校的报名简章', sub: '体检标准你背下来了', effect: { brave: 2 },
        consequence: '朋友沉默了一会儿，说：“你肯定行。”' },
      { id: 'C3', text: '卡丁车场的兼职申请', sub: '离赛道近一点也好', effect: { speed: 2 },
        consequence: '“先摸到方向盘再说。”你把可乐一口喝完。' },
    ],
    next: 'D',
  },
  D: {
    id: 'D', chapter: 2, chapterTitle: '第二章 · 十七岁', age: '十七岁', place: '深夜',
    still: 'node_d', palette: ['#0d0d16', '#2a2438', '#8a7ba8'],
    lines: [
      '深夜十一点，客厅的灯还亮着。',
      '门缝里漏进来一条光，和压低的争执声。',
      '“……那条路太苦了，走不通的。”',
    ],
    prompt: '门把手就在手边。你——',
    timer: 10,
    onTimeout: { consequence: '客厅的灯灭了。你在门后站了很久，什么也没说。', regret: true },
    choices: [
      { id: 'D1', text: '推门进去，把话说完', sub: '就今晚，说清楚', boostDominant: 2,
        consequence: '那晚的话你说得磕磕绊绊，但一句都没有收回。' },
      { id: 'D2', text: '回到床上，再想想', sub: '也许他们是对的', regret: true,
        consequence: '你躺回黑暗里。那张纸在枕头下面，又压了很多年。' },
    ],
    next: null,
  },
  E: {
    id: 'E', chapter: 3, chapterTitle: '第三章 · 二十五岁', age: '二十五岁', place: '镜前',
    still: 'node_e', palette: ['#0a0c12', '#232c3e', '#9fb8d8'],
    lines: [
      '二十五岁生日，你在镜子前站了很久。',
      '镜子里的人，轮廓和你一模一样，',
      '但走的是那条你差点选了的路。',
    ],
    prompt: '镜面泛起涟漪。这段预演人生——',
    choices: [
      { id: 'E1', text: '走进去', sub: '这就是我选的', consequence: '' },
      { id: 'E2', text: '换一扇门', sub: '再看看别的可能', consequence: '' },
    ],
    next: null,
  },
}

export const CHAPTER_FLOW = [
  { chapter: 1, nodes: ['A', 'B'] },
  { chapter: 2, nodes: ['C', 'D'] },
  { chapter: 3, nodes: ['E'] },
]

export function dominantCareer(stats: Record<Stat, number>): Career {
  const entries: [Career, number][] = [
    ['soldier', stats.brave], ['painter', stats.color], ['racer', stats.speed],
  ]
  entries.sort((a, b) => b[1] - a[1])
  return entries[0][0]
}
