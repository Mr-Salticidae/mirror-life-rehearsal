// RTX 本地 AI 人生预演报告
// OpenAI 兼容端点（LM Studio / Ollama / vLLM），public/config.json 可配；失败走本地模板兜底
// 称号由本地称号池决定（lib/titles.ts），AI 只负责叙事段落与结语
import { Career, Ending, CAREER_INFO } from '../story'
import { PathStep } from '../store'

export interface ReportInput {
  ending: Ending
  overridden: boolean
  regret: boolean
  timeouts: number
  path: PathStep[]
  gameScore: number
  gameDetail: string
}

export interface Report {
  paragraphs: string[] // 三段人生叙事
  finalWord: string    // 给现实的你
  fromAI: boolean
}

interface AiConfig { baseUrl: string; model: string; apiKey?: string; timeoutMs?: number }

let cfgCache: AiConfig | null = null
async function loadConfig(): Promise<AiConfig> {
  if (cfgCache) return cfgCache
  try {
    const r = await fetch(`${import.meta.env.BASE_URL}config.json`, { cache: 'no-store' })
    cfgCache = { timeoutMs: 20000, ...(await r.json()) }
  } catch {
    cfgCache = { baseUrl: 'http://127.0.0.1:1234/v1', model: 'local-model', timeoutMs: 20000 }
  }
  return cfgCache!
}

function pathSummary(input: ReportInput): string {
  const steps = input.path.map(p => `${p.nodeId}:${p.choiceText}`).join('；')
  const endDesc = input.ending === 'drifter'
    ? '最终没有走进任何一扇门——镜子判定此人为「无名者」：一生都在犹豫与摇摆，没有选择也是一种人生'
    : `最终职业：${CAREER_INFO[input.ending as Career].name}` +
      (input.overridden ? '（在镜前换了一扇门）' : '（顺着预演走了进去）') +
      `。职业体验：${input.gameDetail}`
  return `选择轨迹：${steps}。${endDesc}` +
    (input.regret ? '。轨迹里有过一次没说出口的遗憾' : '') +
    (input.timeouts > 0 ? `。犹豫（超时未选）${input.timeouts} 次` : '') + '。'
}

export async function generateReport(input: ReportInput): Promise<Report> {
  const cfg = await loadConfig()
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), cfg.timeoutMs ?? 20000)
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
      },
      signal: ctrl.signal,
      body: JSON.stringify({
        model: cfg.model,
        temperature: 0.9,
        max_tokens: 700,
        messages: [
          {
            role: 'system',
            content:
              '你是《镜像自我·人生预演》的旁白，文风克制、电影感、第二人称，不用感叹号，不说教。' +
              '根据玩家的人生选择轨迹，输出严格的 JSON（不要 markdown 代码块）：' +
              '{"paragraphs":["童年段","少年段","结局段"],"finalWord":"给现实中的这个人的一句话，30字内"}。' +
              '每段 60~90 字。若轨迹里有遗憾或犹豫，在少年段轻轻点到，不渲染。' +
              '若此人是「无名者」（未选择任何职业），结局段写"没有选择"本身，冷静而不悲观。',
          },
          { role: 'user', content: pathSummary(input) },
        ],
      }),
    })
    clearTimeout(timer)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const text: string = data.choices?.[0]?.message?.content ?? ''
    const jsonStr = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(jsonStr)
    if (!Array.isArray(parsed.paragraphs) || !parsed.finalWord) throw new Error('bad shape')
    return { paragraphs: parsed.paragraphs.slice(0, 3), finalWord: parsed.finalWord, fromAI: true }
  } catch (e) {
    console.warn('[ai] 本地端点不可用，走模板兜底', e)
    return templateReport(input)
  }
}

// ---------- 模板兜底 ----------
const T: Record<Career, { child: string; teen: string; job: string; word: string }> = {
  soldier: {
    child: '七岁那年，别人都在看热闹，你在电器行的玻璃前站得笔直。整齐的脚步声穿过屏幕落进你心里，像一颗钉子，钉住了后来所有的摇晃。',
    teen: '十七岁，你把体检标准背得比课文还熟。{REGRET}那张报名表被你压平了很多次，最后一次，它没有再皱回去。',
    job: '于是预演里的你站在风雪的哨位上。{GAME}枪响与心跳都很稳——原来「保护别人」这五个字，你从七岁写到了今天。',
    word: '现实里的勇气不用等风雪，今天就能用一次。',
  },
  painter: {
    child: '七岁那年的巷口，你伸手碰了碰别人没画完的涂鸦，颜料的温度顺着指尖爬上来。从那天起，世界在你眼里就分成了两种：画过的，和还没画的。',
    teen: '十七岁，那张招生单被你折了又折，边都软了。{REGRET}你终于在天台上把它摊开，像摊开一张藏了十年的地图。',
    job: '于是预演里的你在凌晨四点占领了一面墙。{GAME}城市醒来时会看见它——美术馆没给你的展厅，你自己造了一个。',
    word: '现实里那支笔还在，别让它只画别人要的东西。',
  },
  racer: {
    child: '七岁那年，自行车少年从巷尾呼啸而过，风从你耳边过去的声音，你记了很多年。后来你才知道，那不是风，是你自己想往前冲的心跳。',
    teen: '十七岁，你在卡丁车场擦了一个暑假的轮胎，就为了离赛道近一米。{REGRET}方向盘第一次握进手里时，你没有松开。',
    job: '于是预演里的你驶进了雨夜的环线。{GAME}引擎声盖过了所有说「走不通」的声音——路是被车轮说服的。',
    word: '现实里的油门不在车上，在你明天早上的选择里。',
  },
}

const DRIFTER_T = {
  child: '七岁那年，巷口有三样东西同时叫住了你。你都看了，都喜欢，都没有伸手。回家的路上你想：以后再说吧。以后很长，你一直这么想。',
  teen: '十七岁的天台、走廊和深夜的门缝，每一次你都站在原地。不是不想要——是每一样都想要，于是每一样都没敢先要。犹豫也很累，你比谁都清楚。',
  job: '二十五岁，镜子没有为你亮起任何一扇门。但镜子说：没有选择，也是被你亲手选出来的一种人生。它把这句话留给你，不带责备。',
  word: '下一次心跳加速的时候，别管对错，先伸手。',
}

export function templateReport(input: ReportInput): Report {
  if (input.ending === 'drifter') {
    return { paragraphs: [DRIFTER_T.child, DRIFTER_T.teen, DRIFTER_T.job], finalWord: DRIFTER_T.word, fromAI: false }
  }
  const t = T[input.ending as Career]
  const regretLine = input.regret
    ? '有一个深夜你在门后停了很久，那次沉默你一直记得。'
    : ''
  return {
    paragraphs: [
      t.child,
      t.teen.replace('{REGRET}', regretLine),
      t.job.replace('{GAME}', input.gameDetail ? `${input.gameDetail}。` : ''),
    ],
    finalWord: t.word,
    fromAI: false,
  }
}
