// 镜中特写 · AI 读心：观众照片 → 五段人物特写报告
// 端点链见 ai.ts visionEndpoints：主端点（云端 API 或本地）→ 降级端点 → 模板兜底，观感一致。
// 照片只以 dataURL 形式随本次请求发往配置的端点，不落盘、不进任何存储；
// 端点链含云端时，上传页隐私文案会如实告知观众（visionMayGoRemote）。
import { loadConfig, visionEndpoints, isLocalUrl, AiStats } from './ai'
import { Gender } from '../store'

export interface CloseupPoint { label?: string; text: string }
export interface CloseupSection {
  idx: string; key: string; keyEn: string
  sub?: string
  points: CloseupPoint[]
}
export interface CloseupReport {
  sections: CloseupSection[]
  fromAI: boolean
  stats?: AiStats
}

// 读心摘要：五段的副标题 + 总结正文，供终局报告个性化（入 store、进叙事提示词、上卡片/海报/扫码载荷）
export interface CloseupDigest {
  subs: { key: string; sub: string }[]  // 各段小标题（总结段无副标题不收）
  summary: string                       // 05 总结正文（去 ** 标记）
}
export function digestCloseup(r: CloseupReport): CloseupDigest {
  const strip = (t: string) => t.replace(/\*\*/g, '').trim()
  return {
    subs: r.sections
      .filter(s => s.idx !== '05' && s.sub)
      .map(s => ({ key: s.key, sub: strip(s.sub!) })),
    summary: strip(r.sections.find(s => s.idx === '05')?.points.map(p => p.text).join('') ?? ''),
  }
}

// 五段的段名固定在客户端，AI 只产副标题与要点——格式稳定，坏输出也砸不了版式
const SECTION_META = [
  { idx: '01', key: '核心状态', keyEn: 'CORE STATE' },
  { idx: '02', key: '肢体语言', keyEn: 'BODY LANGUAGE' },
  { idx: '03', key: '面部表情', keyEn: 'FACIAL EXPRESSION' },
  { idx: '04', key: '形象与风格', keyEn: 'IMAGE & STYLE' },
  { idx: '05', key: '总结', keyEn: 'SUMMARY' },
] as const

const SYSTEM_PROMPT =
  '你是《镜像自我·人生预演》展台的「镜中读心」，一面会说话的镜子。观众刚在镜前留下一张自己此刻的照片。' +
  '文风克制、电影感、第二人称（称"你"），不用感叹号，不说教。' +
  '只依据画面里真实可见的证据（衣着、姿态、表情、神态、光线、物件）展开，不编造画面外的信息；' +
  '不评价长相美丑，不猜年龄数字，不做任何负面或身体羞辱式评判，语气温和、给人力量。\n' +
  '严格按以下纯文本格式输出五段，规则：编号必须是两位数字 01~05 加竖线；每段至少一个以"- "开头的要点行，' +
  '要点正文 40~120 字；不要 JSON、不要 markdown 标题、不要编号之外的任何前后缀；段与段之间空一行。\n' +
  '01|一句概括此刻状态的副标题\n- 此刻状态的判断与画面证据，可用 **文字** 标注重点\n\n' +
  '02|一句副标题\n- 手部动作：观察与解读\n- 姿态：观察与解读\n\n' +
  '03|一句副标题\n- 对表情与眼神的观察与解读\n\n' +
  '04|一句副标题\n- 穿搭：观察与解读\n\n' +
  '05|\n- 总结 60~90 字，收在一句写给这位观众的话上（这句话是接下来人生预演的开场）\n' +
  '02 与 04 的要点行冒号前是 2~4 字的观察侧重（如 手部动作、肩线、发型、穿搭、配饰），按画面实际情况自拟，没有就不用冒号。'

function userPrompt(gender: Gender | null): string {
  const who = gender ? `选择了「${gender === 'female' ? '女生' : '男生'}」入口的观众` : '观众'
  return `镜子前是一位${who}。照片是这位观众此刻真实的样子。请读这张照片。`
}

// ---------- 解析：容忍半包（流式进行中随时可整段渲染） ----------
// 协议块形如「NN|副标题\n- 要点\n- 要点」；要点行「标签：正文」拆出金色标签（标签 ≤6 字才算）
export function parseCloseup(text: string): CloseupSection[] {
  const clean = text.replace(/```[a-z]*|```/g, '').replace(/\r/g, '').trim()
  if (!clean) return []
  const out: CloseupSection[] = []
  const blocks = clean.split(/\n\s*(?=0?[1-5]\s*\|)/)
  for (const raw of blocks) {
    const m = raw.match(/^0?([1-5])[ \t]*\|[ \t]*(.*)$/m)
    if (!m) continue
    const meta = SECTION_META[Number(m[1]) - 1]
    if (out.some(s => s.idx === meta.idx)) continue
    const lines = raw.slice(raw.indexOf(m[0]) + m[0].length).split('\n')
    const points: CloseupPoint[] = []
    for (const ln of lines) {
      const t = ln.trim().replace(/^[-–•·]\s*/, '')
      if (!t || t === ln.trim()) { // 非要点行：并入上一要点（模型偶发折行）
        if (t && points.length) points[points.length - 1].text += t
        continue
      }
      const lm = t.match(/^([^：:*\s]{1,6})[：:]\s*(.+)$/)
      // 「标签」是格式示例里的占位词，模型偶发照抄——照抄时丢标签只留正文
      if (lm && !/^标签/.test(lm[1])) points.push({ label: lm[1], text: lm[2] })
      else if (lm) points.push({ text: lm[2] })
      else points.push({ text: t })
    }
    let sub = m[2].trim() || undefined
    // 段内无要点但"副标题"长得像正文（超 20 字）：降级为要点，避免整段空心
    if (!points.length && sub && sub.length > 20) { points.push({ text: sub }); sub = undefined }
    out.push({ ...meta, sub, points })
  }
  return out
}

// ---------- 生成：流式；onUpdate 随进度收到"当前已成形的段落" ----------
export async function generateCloseup(
  photoDataUrl: string,
  gender: Gender | null,
  onUpdate?: (sections: CloseupSection[]) => void,
): Promise<CloseupReport> {
  const cfg = await loadConfig()
  // 端点链逐级降：云端视觉 API 挂了落本地模型，都挂落模板（与 ai.ts 同一策略）
  for (const ep of visionEndpoints(cfg)) {
  try {
    const ctrl = new AbortController()
    // 读图预填充比纯文本慢，首包超时放宽到 45s；此后每块刷新 20s 停滞计时
    let stall = window.setTimeout(() => ctrl.abort(), Math.max(cfg.timeoutMs ?? 20000, 45000))
    const bump = () => { clearTimeout(stall); stall = window.setTimeout(() => ctrl.abort(), 20000) }
    const res = await fetch(`${ep.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ep.apiKey ? { Authorization: `Bearer ${ep.apiKey}` } : {}),
      },
      signal: ctrl.signal,
      body: JSON.stringify({
        model: ep.model,
        temperature: 0.5,
        max_tokens: cfg.visionMaxTokens ?? 1100,
        stream: true,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: photoDataUrl } },
              { type: 'text', text: userPrompt(gender) },
            ],
          },
        ],
      }),
    })
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
    const reader = res.body.getReader()
    const dec = new TextDecoder()
    let acc = '', buf = ''
    let firstAt = 0
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
            acc += delta
            onUpdate?.(parseCloseup(acc))
          }
        } catch { /* SSE 半包，等下一块 */ }
      }
    }
    clearTimeout(stall)
    const sections = parseCloseup(acc)
    // 至少读出三段才算成形（含总结更好）；否则视为坏输出走兜底
    if (sections.length < 3 || sections.every(s => !s.points.length)) throw new Error('bad shape')
    const seconds = firstAt ? Math.max(0.1, (performance.now() - firstAt) / 1000) : 0.1
    const stats: AiStats = {
      model: ep.model, chars: acc.length, seconds,
      charsPerSec: Math.round(acc.length / seconds),
      local: isLocalUrl(ep.baseUrl),
    }
    return { sections, fromAI: true, stats }
  } catch (e) {
    console.warn(`[closeup] 视觉端点不可用(${ep.baseUrl})，尝试下一级`, e)
  }
  }
  const t = templateCloseup()
  if (onUpdate) await simulateReveal(t.sections, onUpdate)
  return t
}

// 隐私文案分叉依据：视觉端点链里是否存在云端一跳（存在即须向观众声明照片会离开本机）
export async function visionMayGoRemote(): Promise<boolean> {
  const cfg = await loadConfig()
  return visionEndpoints(cfg).some(ep => !isLocalUrl(ep.baseUrl))
}

// 兜底也逐段浮现（约 2s），与真流式共用同一 UI 节奏
async function simulateReveal(sections: CloseupSection[], onUpdate: (s: CloseupSection[]) => void) {
  for (let i = 1; i <= sections.length; i++) {
    onUpdate(sections.slice(0, i))
    await new Promise(r => setTimeout(r, 380))
  }
}

// ---------- 模板兜底：不装作读了图，只以镜子口吻接住这一步 ----------
export function templateCloseup(): CloseupReport {
  return {
    fromAI: false,
    sections: [
      { ...SECTION_META[0], sub: '此刻，正站在预演的门前', points: [
        { text: '镜子先记下一个事实：你在它面前停了下来。多数人路过镜面时都在整理别人眼中的自己，而你把这张脸交了出来——**这是预演开始前，最诚实的一步**。' },
      ] },
      { ...SECTION_META[1], sub: '站定，是最小的勇敢', points: [
        { label: '姿态', text: '面对镜头没有躲闪，肩线放平。**站定本身就是一种表态**——准备好看一看另一种人生了。' },
      ] },
      { ...SECTION_META[2], sub: '平静之下，藏着期待', points: [
        { text: '今晚镜面有些朦胧，看不真切每一道细节，但那点好奇骗不了镜子——**期待，是所有故事共同的开场**。' },
      ] },
      { ...SECTION_META[3], sub: '今天的你，就是最好的入场装束', points: [
        { label: '装束', text: '无论今天穿了什么，镜子都按原样收下。预演不挑行头，**它只认愿意走进来的人**。' },
      ] },
      { ...SECTION_META[4], points: [
        { text: '镜子还没读完这张脸，但结论可以先说：**七岁那年的巷口，有一个选择在等你**。往前一步，替未来的自己看看路。' },
      ] },
    ],
  }
}
