# 方案 A 一键止血：应用哨兵线下线补丁并重新构建（目标 3 分钟内完成）
# 触发条件见 hotfix/方案A_应用SOP.md；回滚: git apply -R hotfix/方案A_哨兵线下线.patch 后重跑构建
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent

# 系统无 Node 时用项目内便携版（缺失则先跑 准备构建环境.ps1）
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  $portable = Join-Path $root 'tools\node-portable'
  if (-not (Test-Path "$portable\node.exe")) { & "$PSScriptRoot\准备构建环境.ps1" }
  $env:PATH = "$portable;$env:PATH"
}

git -C $root apply --check "$root\hotfix\方案A_哨兵线下线.patch"
git -C $root apply "$root\hotfix\方案A_哨兵线下线.patch"
Write-Host "补丁已应用，开始构建 ..."

Push-Location "$root\app"
try {
  if (-not (Test-Path node_modules)) { npm ci --no-audit --no-fund }
  npm run build
} finally { Pop-Location }

Write-Host ""
Write-Host "== 构建完成: app/dist =="
Write-Host "下一步二选一:"
Write-Host "  a) 重新打包整包: .\deploy-kiosk\打包展台.ps1"
Write-Host "  b) 只更新展台机: 用 app/dist/* 覆盖展台机 app/（先备份并保留现场已改的 config.json）"
Write-Host "验收: E1 只出四条线; E2 只有四扇门; 全守倾向落画家（见 SOP）"
