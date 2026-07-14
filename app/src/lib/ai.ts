// RTX 本地 AI 人生预演报告
// OpenAI 兼容端点（LM Studio / Ollama / vLLM），public/config.json 可配；失败走本地模板兜底
// 称号由本地称号池决定（lib/titles.ts），AI 只负责叙事段落与结语
import { Ending, CAREER_INFO } from '../story'
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
  stats?: AiStats      // 真实推理遥测（仅 fromAI 时有）——展台"本地算力可见化"用
}

// 全部来自真实生成过程的可验证数据；按"字/秒"计（token 数端点不回传，不做估算不编数字）
export interface AiStats {
  model: string
  chars: number      // 生成总字数
  seconds: number    // 首字到完稿耗时
  charsPerSec: number
}

// 模型替换接口：public/config.json 全量可配，任何 OpenAI 兼容端点（本地 LM Studio/Ollama/vLLM 或云端中转）即插即用
// baseUrl/model 必配；apiKey 云端用（勿提交进库）；temperature/maxTokens 按模型特性调（更强模型可放宽）
// visionModel：镜中特写读图用的多模态模型，不配则复用 model（模型无视觉能力时读心自动走模板兜底）
export interface AiConfig {
  baseUrl: string; model: string; apiKey?: string; timeoutMs?: number
  temperature?: number; maxTokens?: number
  visionModel?: string; visionMaxTokens?: number
}

let cfgCache: AiConfig | null = null
export async function loadConfig(): Promise<AiConfig> {
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
  const endDesc = `最终职业：${CAREER_INFO[input.ending].name}` +
    (input.overridden ? '（在镜前换了一扇门）' : '（顺着预演走了进去）') +
    `。职业体验：${input.gameDetail}`
  return `选择轨迹：${steps}。${endDesc}` +
    (input.regret ? '。轨迹里有过一次没说出口的遗憾' : '') +
    (input.timeouts > 0 ? `。犹豫（超时未选）${input.timeouts} 次` : '') + '。'
}

// 流式生成：onText 随生成进度收到累计全文（RTX 打字机演出）；离线模板也模拟逐字，观感一致
export async function generateReport(input: ReportInput, onText?: (t: string) => void): Promise<Report> {
  const cfg = await loadConfig()
  try {
    const ctrl = new AbortController()
    // 首包按配置超时，此后每个数据块刷新 15s 停滞计时（避免长生成被整体超时掐断）
    let stall = window.setTimeout(() => ctrl.abort(), cfg.timeoutMs ?? 20000)
    const bump = () => { clearTimeout(stall); stall = window.setTimeout(() => ctrl.abort(), 15000) }
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
      },
      signal: ctrl.signal,
      body: JSON.stringify({
        model: cfg.model,
        temperature: cfg.temperature ?? 0.9,
        max_tokens: cfg.maxTokens ?? 700,
        stream: true,
        messages: [
          {
            role: 'system',
            content:
              '你是《镜像自我·人生预演》的旁白，文风克制、电影感、第二人称，不用感叹号，不说教。' +
              '根据玩家的人生选择轨迹输出纯文本（不要 JSON、不要 markdown、不要标题）：' +
              '三段叙事——童年段、少年段、结局段，每段 60~90 字，段落之间用一个空行分隔；' +
              '最后另起一段，以「——」开头，写给现实中这个人的一句话（30 字内）。' +
              '若轨迹里有遗憾或犹豫，在少年段轻轻点到，不渲染。',
          },
          { role: 'user', content: pathSummary(input) },
        ],
      }),
    })
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
    const reader = res.body.getReader()
    const dec = new TextDecoder()
    let acc = '', buf = ''
    let firstAt = 0 // 首字时间戳——遥测从首字起算（排除排队/预填充，量的是生成吞吐）
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      bump()
      buf += dec.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop() ?? ''
      for (const ln of lines) {
        const s = ln.trim()
        if (!s.startsWith('data:')) continue
        const payload = s.slice(5).trim()
        if (payload === '[DONE]') continue
        try {
          const delta: string = JSON.parse(payload).choices?.[0]?.delta?.content ?? ''
          if (delta) {
            if (!firstAt) firstAt = performance.now()
            acc += delta; onText?.(acc)
          }
        } catch { /* SSE 半包，等下一块 */ }
      }
    }
    clearTimeout(stall)
    const parsed = parsePlain(acc)
    if (!parsed) throw new Error('bad shape')
    const seconds = firstAt ? Math.max(0.1, (performance.now() - firstAt) / 1000) : 0.1
    const stats: AiStats = {
      model: cfg.model, chars: acc.length, seconds,
      charsPerSec: Math.round(acc.length / seconds),
    }
    return { ...parsed, fromAI: true, stats }
  } catch (e) {
    console.warn('[ai] 本地端点不可用，走模板兜底', e)
    const t = templateReport(input)
    if (onText) await simulateStream(t, onText)
    return t
  }
}

// 纯文本协议解析：空行分段，「——」起头段为结语；兼容模型偶发回退 JSON
function parsePlain(text: string): { paragraphs: string[]; finalWord: string } | null {
  const clean = text.replace(/```[a-z]*|```/g, '').trim()
  if (!clean) return null
  if (clean.startsWith('{')) {
    try {
      const p = JSON.parse(clean)
      if (Array.isArray(p.paragraphs) && p.finalWord)
        return { paragraphs: p.paragraphs.slice(0, 3), finalWord: p.finalWord }
    } catch { /* 落回纯文本解析 */ }
  }
  const segs = clean.split(/\n{2,}/).map(s => s.trim()).filter(Boolean)
  if (segs.length < 2) return null
  let finalWord = ''
  const fw = segs.findIndex(s => /^[—–\-]{1,2}/.test(s))
  if (fw >= 0) { finalWord = segs[fw].replace(/^[—–\-]{1,2}\s*/, ''); segs.splice(fw, 1) }
  if (!finalWord) finalWord = segs.pop()!
  return { paragraphs: segs.slice(0, 3), finalWord }
}

// 离线模板的模拟流式（约 2.3s 播完），与真流式共用同一 UI
async function simulateStream(r: Report, onText: (t: string) => void) {
  const full = r.paragraphs.join('\n\n') + '\n\n—— ' + r.finalWord
  const step = Math.max(2, Math.round(full.length / 90))
  for (let i = step; i < full.length; i += step) {
    onText(full.slice(0, i))
    await new Promise(res => setTimeout(res, 25))
  }
  onText(full)
}

// ---------- 模板兜底 ----------
const T: Record<Ending, { child: string; teen: string; job: string; word: string }> = {
  soldier: {
    child: '七岁那年，别人都在看热闹，你在电器行的玻璃前站得笔直。整齐的脚步声穿过屏幕落进你心里，像一颗钉子，钉住了后来所有的摇晃。',
    teen: '十七岁，你把体检标准背得比课文还熟。{REGRET}那张报名表被你压平了很多次，最后一次，它没有再皱回去。',
    job: '于是预演里的你站在风雪的哨位上。{GAME}枪响与心跳都很稳——原来「保护别人」这四个字，你从七岁写到了今天。',
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
  musician: {
    child: '七岁那年，那盘二手磁带在最小的音量里响了一整晚。你把耳朵贴在录音机上，听见了一个比巷子大得多的世界。',
    teen: '十七岁，你在课本下面打拍子，手指敲的是桌板，心里响的是一整支乐队。{REGRET}那把二手吉他进家门时弦都锈了，你一根一根换掉。',
    job: '于是预演里的你站上了地下的小舞台。{GAME}灯烫，手抖，但第一个和弦落下去的时候，台下有人跟着晃——这歌没白写。',
    word: '现实里那段旋律还在。哼出来，别让它只在你脑子里开演唱会。',
  },
  astronaut: {
    child: '七岁那年，你用攒下的硬币换了一副望远镜，在天台趴了一整夜。别人在数星星，你在找路。',
    teen: '十七岁，招飞简章上的视力要求你查了三遍。{REGRET}体检那天你起得比天亮还早，像去赴一个和天空的约。',
    job: '于是预演里的你飘在一整柜台的星星中间。{GAME}地球在舷窗外缓缓转动，你想起天台上那个孩子——他到得比想象更远。',
    word: '现实里的远方不在天上，在你今晚敢不敢点开那个报名入口。',
  },
}

export function templateReport(input: ReportInput): Report {
  const t = T[input.ending]
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
