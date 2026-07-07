// 《镜像自我·人生预演》分支剧本数据 · 迭代三（五结局架构，基准：content/五结局扩容计划_db.md）
// 五条职业线：哨兵(guard 守) / 画家(create 创) / 赛车手(swift 疾) / 音乐人(rhythm 韵) / 宇航员(far 远)

export type Career = 'soldier' | 'painter' | 'racer' | 'musician' | 'astronaut'
export type Ending = Career
export type Stat = 'guard' | 'create' | 'swift' | 'rhythm' | 'far'

export interface Choice {
  id: string
  text: string
  sub?: string            // 选项副文本（小字）
  effect?: Partial<Record<Stat, number>>
  boostDominant?: number  // 给当前最高倾向加值（"坚持"类选择）
  regret?: boolean        // 记遗憾 flag
  hold?: boolean          // 长按型选择（按住 1.0s 确认，松手=退缩）
  consequence: string     // 选择后的一句后果文本
}

// 回响台词：早前某个选择会让本节点多出一句"被记得"的台词
export interface EchoLine {
  when: string   // 前置 choiceId；'timeout:B' 表示 B 节点超时；'regret' 表示遗憾 flag
  text: string
}

export interface StoryNode {
  id: string
  chapter: number
  chapterTitle: string
  age: string
  place: string
  still: string
  palette: [string, string, string]
  lines: string[]
  echoes?: EchoLine[]
  prompt: string
  timer?: number
  onTimeout?: { consequence: string; regret?: boolean }
  choices: Choice[]
  next: string | null
}

export const CAREER_INFO: Record<Career, {
  name: string; title: string; game: string; gameHint: string
  introStill: string; endStill: string
  introLines: string[]
  palette: [string, string, string]
  slogan: string
  typeCode: string
}> = {
  soldier: {
    name: '哨兵', title: '守夜', game: 'fps',
    gameHint: '鼠标瞄准 · 点击射击 · 红色为标靶（打头×2）· 白色为平民，误伤扣分',
    introStill: 'career_soldier', endStill: 'end_soldier',
    introLines: [
      '二十六岁，你在边境哨所度过第四个冬天。',
      '今夜风雪很大，轮到你守夜。',
      '远处传来动静——考核开始了。',
    ],
    palette: ['#0a1420', '#1d3a52', '#7fb4d8'],
    slogan: '你守过的夜，成了别人的白天。',
    typeCode: 'GNTR',
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
    slogan: '你留下的颜色，比你的名字活得更久。',
    typeCode: 'CNSR',
  },
  racer: {
    name: '赛车手', title: '夜环线', game: 'race',
    gameHint: '← → 或 A D 转向（或点按屏幕左/右侧）· 躲开车流 · 蓝色光点是氮气',
    introStill: 'career_racer', endStill: 'end_racer',
    introLines: [
      '二十六岁，你终于攒够了改装费。',
      '雨夜的环线空无一人。',
      '引擎在等你把油门踩下去。',
    ],
    palette: ['#03060f', '#12233f', '#4f8fe8'],
    slogan: '你追过的风，最后成了你身后的路。',
    typeCode: 'CFSV',
  },
  musician: {
    name: '音乐人', title: '躁动', game: 'rhythm',
    gameHint: 'D F J K 或点击轨道 · 在判定线接拍 · 连击越高分越多',
    introStill: 'career_musician', endStill: 'end_musician',
    introLines: [
      '二十六岁，你的歌还没几个人听过。',
      '但今晚，地下那间小 livehouse 把灯交给了你。',
      '第一个和弦响起来的时候，手是抖的。',
    ],
    palette: ['#1a0f24', '#4b1f5e', '#c98bff'],
    slogan: '你踩下的每一拍，都有人跟着晃。',
    typeCode: 'CNTV',
  },
  astronaut: {
    name: '宇航员', title: '失重', game: 'dock',
    gameHint: '← → 微调速度 · 空格制动（或按住屏幕左/中/右）· 把飞船送进对接窗口',
    introStill: 'career_astronaut', endStill: 'end_astronaut',
    introLines: [
      '二十六岁，你终于飞过了七岁时用望远镜看过的地方。',
      '舱外是整柜台的星星，舱内只有你的呼吸。',
      '前方是空间站的对接窗口——慢一点，稳一点。',
    ],
    palette: ['#040814', '#10244a', '#7fb4e8'],
    slogan: '你看过的远方，后来成了别人的方向。',
    typeCode: 'CFSR',
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
      { id: 'A1', text: '墙上那幅没画完的涂鸦', sub: '颜色在夕阳里发烫', effect: { create: 2 },
        consequence: '你伸手碰了碰墙上的颜料。那天之后，你的课本边角再也没有空白过。' },
      { id: 'A2', text: '巷尾飞驰而过的自行车少年', sub: '车轮卷起一阵风', effect: { swift: 2 },
        consequence: '风从耳边过去的声音，你记了很多年。' },
      { id: 'A3', text: '电器行电视里的阅兵直播', sub: '脚步声整齐得像一个人', effect: { guard: 2 },
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
    echoes: [
      { when: 'A1', text: '你的橡皮上，还沾着昨天从那面墙上蹭到的蓝色。' },
    ],
    prompt: '老师快走到你桌前了，你落笔——',
    timer: 8,
    onTimeout: { consequence: '纸被收走了，格子还空着。有些答案，要等很多年才敢写。' },
    choices: [
      { id: 'B1', text: '不写字，画满整页', sub: '梦想没法用字写', effect: { create: 1 },
        consequence: '老师举着你的"作文"看了很久，没有批评你。' },
      { id: 'B2', text: '"我要开最快的车"', sub: '一行字，笔画很用力', effect: { swift: 1 },
        consequence: '同桌笑了。你没笑。' },
      { id: 'B3', text: '"我要保护别人"', sub: '字写得方方正正', effect: { guard: 1 },
        consequence: '这五个字后来你又写过一次，在一张志愿表上。' },
    ],
    next: 'F',
  },
  F: {
    id: 'F', chapter: 1, chapterTitle: '第一章 · 七岁', age: '七岁', place: '储蓄罐',
    still: 'node_f', palette: ['#241a12', '#5e4426', '#e8c080'],
    lines: [
      '储蓄罐终于满了。硬币倒在床单上，你数了三遍。',
    ],
    echoes: [
      { when: 'A1', text: '巷口那面墙的颜色，在你脑子里晃了一个星期。' },
      { when: 'A2', text: '风声还留在耳朵里。你想要更快的东西。' },
      { when: 'A3', text: '你还记得屏幕里那些笔直的背影。' },
    ],
    prompt: '刚好够买一样东西——',
    choices: [
      { id: 'F1', text: '二十四色的颜料', sub: '铁盒的，带一支细笔', effect: { create: 1 },
        consequence: '铁盒打开的那一声，比过年还响。' },
      { id: 'F2', text: '会跑的四驱车模', sub: '橱窗里最快的那台', effect: { swift: 1 },
        consequence: '你给它起了名字。它跑坏之前，赢遍了整条巷子。' },
      { id: 'F3', text: '一副望远镜', sub: '能看到很远的地方', effect: { far: 2 },
        consequence: '你趴在天台上看了一夜，第一次知道天上也有路。' },
      { id: 'F4', text: '一盘二手摇滚磁带', sub: '封面都磨白了', effect: { rhythm: 2 },
        consequence: '那晚你把音量拧到最小，耳朵贴着录音机听完了整面 A 面。' },
    ],
    next: null,
  },
  C: {
    id: 'C', chapter: 2, chapterTitle: '第二章 · 十七岁', age: '十七岁', place: '天台',
    still: 'node_c', palette: ['#26160e', '#8a4a2a', '#f5c890'],
    lines: [
      '高三，晚自习前的天台。',
      '最好的朋友把可乐递给你：',
      '"说真的，你以后到底想干嘛？"',
    ],
    echoes: [
      { when: 'B1', text: '"小学那篇用画交上去的作文，我到现在还记得。"' },
      { when: 'B2', text: '"你小学作文就写要开最快的车，一直没变啊。"' },
      { when: 'B3', text: '"从『我要保护别人』到现在，你没变过。"' },
      { when: 'timeout:B', text: '"那年作文课你交了白卷。这次，别再空着了。"' },
      { when: 'F3', text: '那副望远镜还在你抽屉里，镜片擦得很亮。' },
      { when: 'F4', text: '那盘磁带你已经听到会背，连走音的地方都会。' },
    ],
    prompt: '你从书包里掏出了那张藏了很久的——',
    choices: [
      { id: 'C1', text: '美术集训班的招生单', sub: '折了又折，边都软了', effect: { create: 2 },
        consequence: '"学费我自己想办法。"你听见自己说。' },
      { id: 'C2', text: '军校的报名简章', sub: '体检标准你背下来了', effect: { guard: 2 },
        consequence: '朋友沉默了一会儿，说："你肯定行。"' },
      { id: 'C3', text: '卡丁车场的兼职申请', sub: '离赛道近一点也好', effect: { swift: 2 },
        consequence: '"先摸到方向盘再说。"你把可乐一口喝完。' },
      { id: 'C4', text: '航空招飞的简章', sub: '视力要求你查过三遍', effect: { far: 2 },
        consequence: '"上面很冷吧。"朋友说。你说不知道，但想亲自去冷一次。' },
    ],
    next: 'G',
  },
  G: {
    id: 'G', chapter: 2, chapterTitle: '第二章 · 十七岁', age: '十七岁', place: '走廊',
    still: 'node_g', palette: ['#1a1e22', '#3a4a52', '#a8c0cc'],
    lines: [
      '月考成绩出来了，往下掉了十一名。',
      '班主任把你叫到走廊，成绩单折在他手里：',
      '"最近在忙什么，你自己心里清楚。"',
    ],
    prompt: '你开口——',
    timer: 8,
    onTimeout: { consequence: '走廊里只有风。他叹了口气，把成绩单塞回你手里。' },
    choices: [
      { id: 'G1', text: '"我知道自己在做什么。"', sub: '声音不大，但没有抖', boostDominant: 1,
        consequence: '他盯着你看了很久，最后只说了一句："别后悔。"' },
      { id: 'G2', text: '"我会收心的。"', sub: '先过了这一关再说', regret: true,
        consequence: '他点点头走了。你把那句话咽了回去，咽得很慢。' },
      { id: 'G3', text: '接过成绩单，什么也没说', sub: '沉默也是一种回答',
        consequence: '纸的边缘割了一下手指。你没吭声。' },
    ],
    next: 'D',
  },
  D: {
    id: 'D', chapter: 2, chapterTitle: '第二章 · 十七岁', age: '十七岁', place: '深夜',
    still: 'node_d', palette: ['#0d0d16', '#2a2438', '#8a7ba8'],
    lines: [
      '深夜十一点，客厅的灯还亮着。',
      '门缝里漏进来一条光，和压低的争执声。',
      '"……那条路太苦了，走不通的。"',
    ],
    echoes: [
      { when: 'G1', text: '白天在走廊说过的话，今晚要再说一遍——这次是对他们。' },
      { when: 'G2', text: '你答应过老师要收心。可枕头底下那张纸，今晚又烫了起来。' },
    ],
    prompt: '门把手就在手边。你——',
    timer: 10,
    onTimeout: { consequence: '客厅的灯灭了。你在门后站了很久，什么也没说。', regret: true },
    choices: [
      { id: 'D1', text: '推门进去，把话说完', sub: '按住不放，直到门开', boostDominant: 2, hold: true,
        consequence: '那晚的话你说得磕磕绊绊，但一句都没有收回。' },
      { id: 'D2', text: '回到床上，再想想', sub: '也许他们是对的', regret: true,
        consequence: '你躺回黑暗里。那张纸在枕头下面，又压了很多年。' },
    ],
    next: null,
  },
  H: {
    id: 'H', chapter: 3, chapterTitle: '第三章 · 二十五岁', age: '二十二岁', place: '出租屋',
    still: 'node_h', palette: ['#181410', '#4a3a24', '#d8b070'],
    lines: [
      '二十二岁，第一份工资到账。',
      '扣掉房租，剩下的数字不大——但完整地属于你。',
    ],
    echoes: [
      { when: 'D1', text: '那晚推开门之后，这条路你已经走了五年。' },
      { when: 'D2', text: '有些话当年没说出口。这五年，你在用别的方式对自己说。' },
      { when: 'timeout:D', text: '有些话当年没说出口。这五年，你在用别的方式对自己说。' },
      { when: 'F4', text: '那盘磁带早就听坏了。现在你想自己做一盘。' },
    ],
    prompt: '你给自己买了——',
    choices: [
      { id: 'H1', text: '一套正经的画具', sub: '不再是铁盒颜料了', effect: { create: 1 },
        consequence: '快递箱拆开的瞬间，你想起了七岁那声铁盒的响。' },
      { id: 'H2', text: '一次赛道日体验券', sub: '两小时，真正的赛道', effect: { swift: 1 },
        consequence: '头盔扣上的那一刻，整个世界都安静了。' },
      { id: 'H3', text: '一双能走长路的靴子', sub: '结实，防水，耐磨', effect: { guard: 1 },
        consequence: '你知道自己要去的地方，路不会太好走。' },
      { id: 'H4', text: '一把二手吉他', sub: '琴颈上有前主人的手汗', effect: { rhythm: 2 },
        consequence: '第一个和弦按响时，楼下敲了两下暖气管。你弹得更轻，但没有停。' },
    ],
    next: 'E',
  },
  E: {
    id: 'E', chapter: 3, chapterTitle: '第三章 · 二十五岁', age: '二十五岁', place: '镜前',
    still: 'node_e', palette: ['#0a0c12', '#232c3e', '#9fb8d8'],
    lines: [
      '二十五岁生日，你在镜子前站了很久。',
      '镜子里的人，轮廓和你一模一样，',
      '但走的是那条你差点选了的路。',
    ],
    echoes: [
      { when: 'regret', text: '镜子里的人，替你说了那句你没说出口的话。' },
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
  { chapter: 1, nodes: ['A', 'B', 'F'] },
  { chapter: 2, nodes: ['C', 'G', 'D'] },
  { chapter: 3, nodes: ['H', 'E'] },
]

// 每维全树最大可达分（不含 boostDominant），构建期静态值
export const MAX_REACH: Record<Stat, number> = {
  guard: 6,   // A3(2)+B3(1)+C2(2)+H3(1)
  create: 7,  // A1(2)+B1(1)+F1(1)+C1(2)+H1(1)
  swift: 7,   // A2(2)+B2(1)+F2(1)+C3(2)+H2(1)
  rhythm: 4,  // F4(2)+H4(2)
  far: 4,     // F3(2)+C4(2)
}

const STAT_TO_CAREER: [Stat, Career][] = [
  ['guard', 'soldier'], ['create', 'painter'], ['swift', 'racer'],
  ['rhythm', 'musician'], ['far', 'astronaut'],
]

// 五维路由：开方阻尼归一化 —— norm = stat / sqrt(maxReach)
// 相比纯占比(stat/max)，瘦维度(韵/远)仍有可达性优势，但两次顺手点击不再直接封顶；
// 并列时按固定优先级 守 > 创 > 疾 > 韵 > 远（STAT_TO_CAREER 的声明序）。
export function dominantEnding(stats: Record<Stat, number>): Career {
  let best: Career = 'soldier'
  let bestScore = -1
  for (const [stat, career] of STAT_TO_CAREER) {
    const score = stats[stat] / Math.sqrt(MAX_REACH[stat])
    if (score > bestScore + 1e-9) { bestScore = score; best = career }
  }
  return best
}

// 当前最高维（boostDominant 用），同上优先级
export function dominantStat(stats: Record<Stat, number>): Stat {
  let best: Stat = 'guard'
  let bestScore = -1
  for (const [stat] of STAT_TO_CAREER) {
    const score = stats[stat] / Math.sqrt(MAX_REACH[stat])
    if (score > bestScore + 1e-9) { bestScore = score; best = stat }
  }
  return best
}
