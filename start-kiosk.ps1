# 展台一键启动：本地静态服务(vite preview) + 浏览器 kiosk 全屏
# 入口：双击根目录「双击启动展台.bat」；排障时可 -NoBrowser 只起服务
param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$port = 5174
$url = "http://127.0.0.1:$port/"

# 1) 找 node：优先包内便携版（展会机免装环境），其次系统安装版
$node = Join-Path $root 'tools\node.exe'
if (-not (Test-Path $node)) {
  $cmd = Get-Command node -ErrorAction SilentlyContinue
  if ($cmd) { $node = $cmd.Source }
}
if (-not (Test-Path $node)) {
  Write-Host '[错误] 未找到 node.exe：包内 tools\node.exe 缺失，且系统未安装 Node。压缩包可能不完整。' -ForegroundColor Red
  Read-Host '按回车退出'; exit 1
}

# 2) 检查构建产物
if (-not (Test-Path (Join-Path $root 'app\dist\index.html'))) {
  Write-Host '[错误] app\dist 构建产物缺失，压缩包可能不完整。' -ForegroundColor Red
  Read-Host '按回车退出'; exit 1
}

function Test-Server {
  try { (Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200 } catch { $false }
}

# 3) 起服务（端口上已有服务则直接复用，支持重复双击）
$proc = $null
if (Test-Server) {
  Write-Host "端口 $port 已有服务在跑，直接复用。"
} else {
  $vite = Join-Path $root 'app\node_modules\vite\bin\vite.js'
  $proc = Start-Process $node -ArgumentList @('"' + $vite + '"', 'preview', '--port', "$port", '--strictPort', '--host', '127.0.0.1') `
    -WorkingDirectory (Join-Path $root 'app') -WindowStyle Minimized -PassThru
  $ok = $false
  foreach ($i in 1..30) {
    Start-Sleep -Milliseconds 500
    if ($proc.HasExited) { break }
    if (Test-Server) { $ok = $true; break }
  }
  if (-not $ok) {
    Write-Host "[错误] 服务 15 秒内未就绪（端口 $port 可能被其他程序占用）。" -ForegroundColor Red
    if ($proc -and -not $proc.HasExited) { Stop-Process -Id $proc.Id -Force -Confirm:$false }
    Read-Host '按回车退出'; exit 1
  }
}
Write-Host "服务已就绪: $url"

# 3.5) 本地 AI（LM Studio）：起服务(带 CORS·镜中读心跨源必需)并预载视觉模型
#      机器上没装 LM Studio 也不阻塞——应用内读心/报告自动走模板兜底
$lms = Join-Path $env:USERPROFILE '.lmstudio\bin\lms.exe'
if (Test-Path $lms) {
  try {
    & $lms server start --port 1234 --cors 2>$null | Out-Null
    $loaded = (& $lms ps 2>$null) -join ' '
    if ($loaded -notmatch 'qwen2\.5-vl-7b-instruct') {
      & $lms load qwen2.5-vl-7b-instruct --gpu max --context-length 4096 -y 2>$null | Out-Null
    }
    Write-Host '本地 AI 已就绪 (LM Studio :1234 · qwen2.5-vl-7b-instruct)'
  } catch { Write-Host '[提示] 本地 AI 启动失败，读心与报告将走模板兜底。' -ForegroundColor Yellow }
} else {
  Write-Host '[提示] 未装 LM Studio，读心与报告走模板兜底。' -ForegroundColor Yellow
}

# 4) 浏览器 kiosk 全屏（独立 user-data-dir 保证 kiosk/自动播放参数生效，不受已开浏览器影响）
if (-not $NoBrowser) {
  $chrome = @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
              "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
              "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
  $edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
            "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
  $flags = @('--kiosk', $url, "--user-data-dir=$env:TEMP\mlr-kiosk-profile",
             '--autoplay-policy=no-user-gesture-required', '--no-first-run', '--disable-infobars',
             '--disable-session-crashed-bubble', '--noerrdialogs', '--overscroll-history-navigation=0')
  if ($chrome) { Start-Process $chrome -ArgumentList $flags }
  elseif ($edge) { Start-Process $edge -ArgumentList ($flags + '--edge-kiosk-type=fullscreen') }
  else { Write-Host "[提示] 未找到 Chrome/Edge，请手动打开浏览器访问 $url 并按 F11 全屏。" -ForegroundColor Yellow }
  Write-Host '已启动全屏展台。退出全屏浏览器: Alt+F4。'
}

# 5) 本窗口保持打开以维持服务
if ($proc) {
  Write-Host '本窗口是展台服务，请保持打开；结束展台时关闭本窗口再关最小化的 node 窗口即可。'
  Wait-Process -Id $proc.Id
}
