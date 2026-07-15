// 《镜像自我·人生预演》线上 AI 中转代理
// 部署在 tiaozhuxiansheng.com 的香港服务器上（nginx location /mlr-api/ → 本服务）。
// 职责：把 /mlr/ 站点的 chat/completions 请求转发到 OpenAI，密钥只存服务器端
// （/etc/mlr-proxy.env），前端产物从此不需要携带任何 apiKey。
// 安全闸：模型白名单 + completion token 上限 + 每 IP 滑动窗口限流 + Origin 校验。
// 隐私：观众照片随请求过境，本服务不落盘、不记请求体，日志只有 IP/模型/状态/耗时。
// 零依赖，Node >= 18（内置 fetch / Readable.fromWeb）。
import http from 'node:http'
import { Readable } from 'node:stream'

const PORT = Number(process.env.PORT || 3002)
// 默认上游走 Cloudflare Worker 跳板（mlr-openai-hop）：OpenAI 按 IP 封锁香港，
// 本机直连 api.openai.com 会被拒（unsupported_country_region_territory）
const UPSTREAM = (process.env.UPSTREAM_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')
const RELAY_TOKEN = process.env.RELAY_TOKEN   // Worker 跳板的通行令牌（直连 OpenAI 时不需要）
const API_KEY = process.env.OPENAI_API_KEY
const MODEL_ALLOW = (process.env.MODEL_ALLOW || 'gpt-5.5').split(',').map(s => s.trim()).filter(Boolean)
const TOKEN_CAP = Number(process.env.MAX_COMPLETION_CAP || 4000)
const RATE_MAX = Number(process.env.RATE_MAX || 30)          // 每 IP 每窗口请求数
const RATE_WINDOW_MS = Number(process.env.RATE_WINDOW_MIN || 5) * 60_000
const MAX_BODY = 8 * 1024 * 1024                              // 观众照片 dataURL 的余量

if (!API_KEY) { console.error('缺 OPENAI_API_KEY（应写在 /etc/mlr-proxy.env）'); process.exit(1) }

// 放行来源：本域（/mlr/ 同源其实不必带 CORS，但浏览器 POST 仍会带 Origin 头）、
// github.io 预览站、本机开发/展台（localhost 任意端口）。
// Origin 可伪造，此闸只挡"别的网站白嫖"；对脚本滥用真正起作用的是限流+模型白名单+token 上限。
const ORIGIN_OK = /^https:\/\/(tiaozhuxiansheng\.com|mr-salticidae\.github\.io)$|^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/

// ---- 每 IP 滑动窗口限流 ----
const hits = new Map()
function rateLimited(ip) {
  const now = Date.now()
  const arr = (hits.get(ip) ?? []).filter(t => now - t < RATE_WINDOW_MS)
  if (arr.length >= RATE_MAX) { hits.set(ip, arr); return true }
  arr.push(now); hits.set(ip, arr); return false
}
setInterval(() => {
  const now = Date.now()
  for (const [k, v] of hits) {
    const a = v.filter(t => now - t < RATE_WINDOW_MS)
    a.length ? hits.set(k, a) : hits.delete(k)
  }
}, 60_000).unref()

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin && ORIGIN_OK.test(origin) ? origin : 'https://tiaozhuxiansheng.com',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

const deny = (res, code, msg, origin) => {
  res.writeHead(code, { 'Content-Type': 'application/json', ...corsHeaders(origin) })
  res.end(JSON.stringify({ error: { message: msg, code } }))
}

http.createServer(async (req, res) => {
  const origin = req.headers.origin
  const url = new URL(req.url, 'http://x')

  if (req.method === 'OPTIONS') { res.writeHead(204, corsHeaders(origin)); return res.end() }
  if (req.method === 'GET' && url.pathname === '/healthz') { res.writeHead(200); return res.end('ok') }
  if (req.method !== 'POST' || url.pathname !== '/v1/chat/completions')
    return deny(res, 404, 'not found', origin)
  if (origin && !ORIGIN_OK.test(origin))
    return deny(res, 403, 'origin not allowed', origin)

  // nginx 在前面，真实来源取 X-Forwarded-For 首跳
  const ip = (req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || req.socket.remoteAddress || '?'
  if (rateLimited(ip)) return deny(res, 429, 'rate limited, try later', origin)

  // 收请求体（限长防灌爆）
  const chunks = []
  let size = 0, tooBig = false
  req.on('data', c => { size += c.length; if (size > MAX_BODY) { tooBig = true; req.destroy() } else chunks.push(c) })
  await new Promise(r => { req.on('end', r); req.on('close', r) })
  if (tooBig) return deny(res, 413, 'body too large', origin)

  let body
  try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')) }
  catch { return deny(res, 400, 'invalid JSON', origin) }
  if (!MODEL_ALLOW.includes(body.model))
    return deny(res, 400, `model not allowed（白名单：${MODEL_ALLOW.join('/')}）`, origin)
  for (const k of ['max_completion_tokens', 'max_tokens'])
    if (typeof body[k] === 'number') body[k] = Math.min(body[k], TOKEN_CAP)

  const t0 = Date.now()
  const ctrl = new AbortController()
  res.on('close', () => ctrl.abort())   // 观众关页即掐上游，不空烧
  try {
    const up = await fetch(`${UPSTREAM}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
        ...(RELAY_TOKEN ? { 'x-relay-token': RELAY_TOKEN } : {}),
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
    res.writeHead(up.status, {
      'Content-Type': up.headers.get('content-type') ?? 'application/json',
      'Cache-Control': 'no-store',
      ...corsHeaders(origin),
    })
    if (up.body) {
      const s = Readable.fromWeb(up.body)
      s.pipe(res)
      await new Promise(r => { s.on('end', r); s.on('error', r); res.on('close', r) })
    } else res.end()
    console.log(`${new Date().toISOString()} ${ip} ${body.model} stream=${!!body.stream} → ${up.status} ${Date.now() - t0}ms`)
  } catch (e) {
    console.warn(`${new Date().toISOString()} ${ip} ${body.model} → 上游失败/中断 ${Date.now() - t0}ms ${e?.name ?? e}`)
    if (!res.headersSent) deny(res, 502, 'upstream unavailable', origin)
    else res.end()
  }
}).listen(PORT, '127.0.0.1', () => console.log(`mlr-ai-proxy 已就位 127.0.0.1:${PORT} → ${UPSTREAM}（模型白名单：${MODEL_ALLOW.join('/')}）`))
