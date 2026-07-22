# 一键部署内测预览：构建 app/dist 并强推到公开预览仓库（GitHub Pages）
# 预览地址: https://mr-salticidae.github.io/mirror-life-rehearsal-preview/
# 说明: 预览仓库只存构建产物, 每次部署覆盖历史; 源码/剧本/协作文档均不出私有主仓库
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

# Windows PowerShell 5.1 会把原生命令写到 stderr 的每一行包成 ErrorRecord，
# 配合上面的 -EAP Stop，"npm 构建成功但打了行日志"、"git add 提示 LF 将换成 CRLF"
# 这类正常输出都会被误判成失败而中断部署。统一走这个包装：输出原样打出来，只认退出码。
function Invoke-Native {
  param(
    [Parameter(Mandatory)][string]$What,
    [Parameter(Mandatory, ValueFromRemainingArguments)][string[]]$Command
  )
  $exe  = $Command[0]
  $rest = @(if ($Command.Count -gt 1) { $Command[1..($Command.Count - 1)] })
  # 函数作用域内降级：2>&1 合流的那一刻 stderr 就已是 ErrorRecord，EAP=Stop 会当场抛，
  # 轮不到后面转字符串。退出函数即自动恢复外层的 Stop。
  $ErrorActionPreference = 'Continue'
  & $exe @rest 2>&1 | ForEach-Object {
    # ErrorRecord 直接插值会把空 stderr 行显示成 RemoteException，取 Message 拿原文
    if ($_ -is [System.Management.Automation.ErrorRecord]) { $_.Exception.Message } else { "$_" }
  } | Write-Host
  if ($LASTEXITCODE -ne 0) { throw "$What 失败（退出码 $LASTEXITCODE）" }
}

Push-Location "$root\app"
Invoke-Native '构建 app' npm run build
Pop-Location

$tmp = Join-Path $env:TEMP ("mlr-preview-" + [guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory -Path $tmp | Out-Null
Copy-Item "$root\app\dist\*" $tmp -Recurse
New-Item -ItemType File -Path "$tmp\.nojekyll" | Out-Null

# 安全闸：预览仓库是公开的。
# ① config.local.json 是 apiKey 的家（构建会把 public/ 原样拷进 dist），发布产物必须整个删掉；
$localCfg = Join-Path $tmp 'config.local.json'
if (Test-Path $localCfg) {
  Remove-Item $localCfg -Force
  Write-Warning "已从发布产物中删除 config.local.json（apiKey 不允许上公网）"
}
# ② config.json 若配了 apiKey/visionApiKey（不该配在这，应放 config.local.json），发布前也强制剔除。
$cfgPath = Join-Path $tmp 'config.json'
if (Test-Path $cfgPath) {
  $cfg = Get-Content $cfgPath -Raw | ConvertFrom-Json
  $dirty = $false
  foreach ($k in @('apiKey', 'visionApiKey')) {
    if ($cfg.PSObject.Properties[$k]) { $cfg.PSObject.Properties.Remove($k); $dirty = $true }
  }
  if ($dirty) {
    $cfg | ConvertTo-Json -Compress | Out-File $cfgPath -Encoding utf8
    Write-Warning "config.json 里发现 apiKey/visionApiKey，已从发布产物中剔除（公开预览站不允许携带任何密钥）"
  }
}

$sha = git -C $root rev-parse --short HEAD
Push-Location $tmp
Invoke-Native 'git init'   git init -q -b main
Invoke-Native 'git add'    git add -A
Invoke-Native 'git commit' git commit -q -m "内测预览部署 $sha"
Invoke-Native 'git remote' git remote add origin https://github.com/Mr-Salticidae/mirror-life-rehearsal-preview.git
Invoke-Native 'git push'   git push -q -f origin main
Pop-Location
Remove-Item -Recurse -Force $tmp

Write-Host "已部署 (源 $sha): https://mr-salticidae.github.io/mirror-life-rehearsal-preview/  (Pages 构建约需 1 分钟)"
