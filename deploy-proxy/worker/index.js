// mlr-openai-hop：OpenAI 区域跳板（Cloudflare Worker + 北美 Durable Object）
// 存在原因：OpenAI 按调用方 IP 区域封锁，tiaozhuxiansheng.com 的香港服务器直连被拒
// （unsupported_country_region_territory）。普通 Worker 就近在香港 PoP 执行仍被拒，
// Smart Placement 实测 20 分钟未挪位；改用 locationHint='enam' 的 Durable Object，
// 强制转发逻辑在北美节点执行、从北美出网。
// 安全：要求 x-relay-token 与 Worker secret 一致（wrangler secret put RELAY_TOKEN），
// 不是公网可白嫖的开放代理；OpenAI 密钥不存这里，由香港代理经 Authorization 头带过来。
import { DurableObject } from 'cloudflare:workers'

export class Hop extends DurableObject {
  async fetch(request) {
    return fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: request.headers.get('authorization') ?? '',
      },
      body: request.body,
    })
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (request.method !== 'POST' || url.pathname !== '/v1/chat/completions')
      return new Response('not found', { status: 404 })
    if (!env.RELAY_TOKEN || request.headers.get('x-relay-token') !== env.RELAY_TOKEN)
      return new Response('forbidden', { status: 403 })
    const stub = env.HOP.get(env.HOP.idFromName('us-hop-v1'), { locationHint: 'enam' })
    return stub.fetch(request)
  },
}
