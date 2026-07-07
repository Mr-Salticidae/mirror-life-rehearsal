// 扫码分享通道：报告数据 → deflate 压缩 → base64url → URL 片段 → 二维码
// 展台纯离线自生成二维码（qrcode 库已打进构建，零外网依赖）；
// 观众手机扫码打开预览站 r.html#<payload>，图文报告在手机端本地还原（剧照走站上 stills/）。
// 载荷瘦身策略：离线模板报告只带种子（rg/gd），叙事文本由手机端用同一模板重新生成；
// 真 AI 报告文本唯一，必须全文上车（ps/fw）。
import QRCode from 'qrcode'
import { Career } from '../story'

export interface SharePayload {
  v: 1
  c: Career
  ti: string              // 称号
  rk: string | null       // 评级
  s: number[]             // 五维原始分，按 reportModel.STAT_ORDER 序
  tl: [string, string][]  // 人生时间线 [nodeId, 选择文本]（剧情序）
  ai: 0 | 1               // 1=真 AI 文本随载荷；0=手机端模板重生成
  ps?: string[]           // 三段叙事（仅 ai=1）
  fw?: string             // 结语（仅 ai=1）
  m?: string              // 模型名（仅 ai=1，展示"由 RTX 本地 AI 生成"）
  cs?: number             // 字/秒（仅 ai=1）
  rg?: 0 | 1              // 遗憾标记（仅 ai=0，模板种子）
  gd?: string             // 职业体验短句（仅 ai=0，模板种子）
  sc?: number             // 游戏得分
}

// 手机报告页部署基址：默认内测预览站；public/config.json 可用 reportBase 覆盖（如换正式域名）
const DEFAULT_REPORT_BASE = 'https://mr-salticidae.github.io/mirror-life-rehearsal-preview/'
let baseCache: string | null = null
async function reportBase(): Promise<string> {
  if (baseCache) return baseCache
  try {
    const r = await fetch(`${import.meta.env.BASE_URL}config.json`, { cache: 'no-store' })
    const cfg = await r.json()
    baseCache = typeof cfg.reportBase === 'string' && cfg.reportBase ? cfg.reportBase : DEFAULT_REPORT_BASE
  } catch {
    baseCache = DEFAULT_REPORT_BASE
  }
  if (!baseCache!.endsWith('/')) baseCache += '/'
  return baseCache!
}

// ---------- base64url（分块处理，避免大数组展开爆栈） ----------
function toB64u(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000)
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function fromB64u(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function pipeBytes(bytes: Uint8Array, ts: ReadableWritablePair<Uint8Array, BufferSource>): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(ts)
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

// 编码：'1'+b64=deflate-raw 压缩，'0'+b64=原文（老浏览器兜底）；两端以首字符区分
export async function encodePayload(p: SharePayload): Promise<string> {
  const raw = new TextEncoder().encode(JSON.stringify(p))
  if (typeof CompressionStream !== 'undefined') {
    try {
      const packed = await pipeBytes(raw, new CompressionStream('deflate-raw'))
      if (packed.length < raw.length) return '1' + toB64u(packed)
    } catch { /* 落回原文编码 */ }
  }
  return '0' + toB64u(raw)
}

export async function decodePayload(hash: string): Promise<SharePayload | null> {
  const s = hash.replace(/^#/, '')
  if (s.length < 2) return null
  try {
    const bytes = fromB64u(s.slice(1))
    const raw = s[0] === '1'
      ? await pipeBytes(bytes, new DecompressionStream('deflate-raw'))
      : bytes
    const p = JSON.parse(new TextDecoder().decode(raw))
    if (p?.v !== 1 || !p.c || !Array.isArray(p.s)) return null
    return p as SharePayload
  } catch {
    return null
  }
}

export async function buildShareUrl(p: SharePayload): Promise<string> {
  return `${await reportBase()}r.html#${await encodePayload(p)}`
}

// ---------- 二维码绘制 ----------
// ECC 用 L：屏扫/图扫无污损场景，密度优先保证小框可扫。
// 反糊三件套（海报实测扫不出的教训）：离屏按"每模块整数像素"绘制 → 关平滑贴入（无抗锯齿灰边）；
// 静区取标准 4 模块；自动感知 ctx 缩放（海报 2x 渲染时按设备像素算模块）。
export function paintQr(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number) {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'L' })
  const n = qr.modules.size
  const quiet = 4
  const total = n + quiet * 2
  const scale = ctx.getTransform().a || 1
  const px = Math.max(1, Math.floor((size * scale) / total)) // 每模块设备像素（整数）

  const off = document.createElement('canvas')
  off.width = off.height = total * px
  const octx = off.getContext('2d')!
  octx.fillStyle = '#ffffff'
  octx.fillRect(0, 0, off.width, off.height)
  octx.fillStyle = '#000000'
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (qr.modules.data[r * n + c])
        octx.fillRect((c + quiet) * px, (r + quiet) * px, px, px)

  // 白底铺满框位，码图居中贴入（逻辑坐标）
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(x, y, size, size)
  const draw = off.width / scale
  const prevSmooth = ctx.imageSmoothingEnabled
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(off, x + (size - draw) / 2, y + (size - draw) / 2, draw, draw)
  ctx.imageSmoothingEnabled = prevSmooth
}
