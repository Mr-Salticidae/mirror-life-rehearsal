#!/usr/bin/env bash
# 一键部署/更新 mlr-ai-proxy 到香港服务器（tiaozhuxiansheng.com / 43.128.2.172）
# 在仓库根目录用 Git Bash 跑：bash deploy-proxy/deploy.sh
# 幂等：重复执行只做更新+重启。密钥从 app/public/config.local.json 读取，经 stdin 写进
# /etc/mlr-proxy.env（chmod 600），不进命令行参数、不进 git。
set -euo pipefail
HOST=root@43.128.2.172
KEY=~/.ssh/tiaozhu_hk
SSH="ssh -i $KEY -o BatchMode=yes -o ConnectTimeout=15"
DIR="$(cd "$(dirname "$0")" && pwd)"

CFG_WIN=$(cygpath -w "$DIR/../app/public/config.local.json")
APIKEY=$(python -c "import json;print(json.load(open(r'$CFG_WIN',encoding='utf-8'))['apiKey'])")
[ -n "$APIKEY" ] || { echo "config.local.json 里没读到 apiKey"; exit 1; }

echo "== 1/5 服务器 node 检查 =="
$SSH $HOST 'command -v node >/dev/null && node -v || { echo 缺node，安装...; apt-get update -qq && apt-get install -y -qq nodejs; node -v; }'

echo "== 2/5 上传服务文件 =="
scp -i "$KEY" "$DIR/mlr-ai-proxy.js" "$HOST:/opt/mlr-proxy/mlr-ai-proxy.js.new" 2>/dev/null \
  || { $SSH $HOST 'mkdir -p /opt/mlr-proxy'; scp -i "$KEY" "$DIR/mlr-ai-proxy.js" "$HOST:/opt/mlr-proxy/mlr-ai-proxy.js.new"; }
scp -i "$KEY" "$DIR/mlr-proxy.service" "$HOST:/etc/systemd/system/mlr-proxy.service"
scp -i "$KEY" "$DIR/nginx-mlr-api.conf" "$HOST:/etc/nginx/snippets/mlr-api.conf"
$SSH $HOST 'mv /opt/mlr-proxy/mlr-ai-proxy.js.new /opt/mlr-proxy/mlr-ai-proxy.js'

echo "== 3/5 写密钥环境文件（stdin，600） =="
# 上游经 Cloudflare Worker 跳板（OpenAI 封锁香港 IP，直连被拒）；
# 中继令牌在 deploy-proxy/.relay-token（gitignore），与 Worker secret RELAY_TOKEN 同值
RELAY=$(cat "$DIR/.relay-token")
printf 'OPENAI_API_KEY=%s\nUPSTREAM_BASE_URL=https://mlr-openai-hop.%s.workers.dev/v1\nRELAY_TOKEN=%s\nMODEL_ALLOW=gpt-5.5\nPORT=3002\n' \
  "$APIKEY" "$(cat "$DIR/.cf-subdomain")" "$RELAY" \
  | $SSH $HOST 'cat > /etc/mlr-proxy.env && chmod 600 /etc/mlr-proxy.env && chown root:root /etc/mlr-proxy.env'

echo "== 4/5 启用并重启服务 =="
$SSH $HOST 'systemctl daemon-reload && systemctl enable --now mlr-proxy && systemctl restart mlr-proxy && sleep 1 && systemctl is-active mlr-proxy && curl -s -o /dev/null -w "healthz: %{http_code}\n" http://127.0.0.1:3002/healthz'

echo "== 5/5 nginx include 检查 =="
$SSH $HOST 'grep -rl "snippets/mlr-api.conf" /etc/nginx/ >/dev/null 2>&1 \
  && echo "include 已存在" \
  || echo "!! 还没挂进 server 块：在 tiaozhuxiansheng.com 的 server{} 里加一行  include snippets/mlr-api.conf;  然后 nginx -t && systemctl reload nginx"'

echo "完成。线上验证：curl -X POST https://tiaozhuxiansheng.com/mlr-api/v1/chat/completions ..."
