# MLR AI 中转代理 · 部署与运维

> 解决的问题：公开站（tiaozhuxiansheng.com/mlr/ 与 github.io 预览）不允许携带 apiKey
> （deploy-preview.ps1 安全闸会剔除），导致线上「镜中读心/终局叙事」全落模板兜底。
> 本代理把密钥留在服务器端，前端零密钥即可走真 AI。

## 架构

```
浏览器（/mlr/ 同源，或 github.io 跨源走 CORS）
  → https://tiaozhuxiansheng.com/mlr-api/v1/chat/completions
  → nginx location /mlr-api/（snippets/mlr-api.conf，关缓冲保 SSE 流式）
  → 127.0.0.1:3002 mlr-proxy.service（本目录 mlr-ai-proxy.js，注入密钥）
  → Cloudflare Worker mlr-openai-hop（worker/，x-relay-token 门禁）
  → 北美 Durable Object（locationHint=enam）→ api.openai.com
```

为什么多两跳：OpenAI 按调用方 IP 区域封锁，香港服务器直连被拒
（unsupported_country_region_territory）；普通 Worker 就近在香港 PoP 执行同样被拒，
Smart Placement 实测 20 分钟不生效，最终用钉在北美的 Durable Object 承载出网
（实测公网全链路首字 ~3s、五段完稿 ~13s，展台节奏无感知差异）。
Worker 部署：`cd deploy-proxy/worker && npx wrangler deploy`；
中继令牌在 `.relay-token`（gitignore），与 Worker secret `RELAY_TOKEN` 同值，
换令牌：改文件 → `npx wrangler secret put RELAY_TOKEN < ../.relay-token` → 重跑 deploy.sh。

前端 `app/public/config.json` 的 `baseUrl` 指向 `https://tiaozhuxiansheng.com/mlr-api/v1`，
apiKey 字段从此不再需要（config.local.json 留着只是历史习惯，客户端带了也会被代理忽略）。
降级链不变：代理挂了 → 本地 LM Studio（若在跑）→ 模板兜底。

## 安全闸（mlr-ai-proxy.js 内）

| 闸 | 默认 | 环境变量 |
|---|---|---|
| 模型白名单 | gpt-5.5 | MODEL_ALLOW（逗号分隔） |
| completion token 上限 | 4000 | MAX_COMPLETION_CAP |
| 每 IP 限流 | 30 次 / 5 分钟 | RATE_MAX / RATE_WINDOW_MIN |
| Origin 校验 | 本域 + github.io 预览 + localhost | 代码内正则 |
| 请求体上限 | 8MB（照片 dataURL 余量） | 代码内常量 |

隐私：照片随请求过境不落盘，日志只记 IP/模型/状态码/耗时，与站内隐私文案一致。

## 部署 / 更新

```bash
bash deploy-proxy/deploy.sh   # 仓库根目录，Git Bash；幂等，可重复跑
```

密钥改动（换 key）：改 app/public/config.local.json 后重跑 deploy.sh 即可。

## 服务器上排查

```bash
systemctl status mlr-proxy          # 服务状态
journalctl -u mlr-proxy -n 50       # 最近日志（每请求一行）
curl http://127.0.0.1:3002/healthz  # 本机探活
```

## 线上验收

```bash
curl -s -X POST https://tiaozhuxiansheng.com/mlr-api/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{"model":"gpt-5.5","max_completion_tokens":2000,"reasoning_effort":"low","messages":[{"role":"user","content":"回复两个字：在线"}]}'
```

期待 200 + 正常 JSON；随后开 https://tiaozhuxiansheng.com/mlr/ 走一局，
读心页脚标应显示「读心完成 · COMPLETE」而非「镜面朦胧 · 以直觉代读」，
终局报告溯源角标应显示「CLOUD AI」而非「OFFLINE MODE」。
