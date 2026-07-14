# 准备便携构建环境：tools/node-portable 缺失时从 nodejs.org 下载解压（约 30MB 下载）
# 已随本机备好一份（不入 git）；换机器或目录丢失时跑这个脚本恢复
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$portable = Join-Path $root 'tools\node-portable'

if (Test-Path "$portable\node.exe") {
  Write-Host "构建环境已就绪: $portable"
  exit 0
}

$ver = 'v22.17.0'
$zip = Join-Path $root "tools\node-$ver-win-x64.zip"
New-Item -ItemType Directory -Force (Join-Path $root 'tools') | Out-Null
Write-Host "下载便携 Node $ver ..."
Invoke-WebRequest -Uri "https://nodejs.org/dist/$ver/node-$ver-win-x64.zip" -OutFile $zip -UseBasicParsing
Expand-Archive $zip -DestinationPath (Join-Path $root 'tools') -Force
Rename-Item (Join-Path $root "tools\node-$ver-win-x64") $portable
Remove-Item $zip
Write-Host "构建环境已就绪: $portable"
