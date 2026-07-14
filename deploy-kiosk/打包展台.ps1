# 展台一键部署包打包脚本 v1.1（健壮性升级版）
# 产物: 仓库根目录 镜像自我_展台部署包_v1.1_YYYYMMDD.zip
# 相比 v1.0:
#   · 预置五线/四线双构建 —— 现场免构建环境，双击 standby\切换_*.bat 即完成方案A止血
#   · 启动器: 真实就绪探测 + 防重入 + 服务崩溃自动拉起 + 浏览器路径全覆盖 + 独立 kiosk 配置目录
#   · 新增 环境加固.bat / 展台自检.bat / 现场SOP.md 随包
#   · reportBase 默认 tiaozhuxiansheng.com/mlr/（大陆移动网络可达）
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$ver = 'v1.1'
$stamp = Get-Date -Format 'yyyyMMdd'

# 0) 定位 node（PATH → 项目便携版 → 旧构建机遗留路径）
$nodeExe = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $nodeExe -and (Test-Path "$root\tools\node-portable\node.exe")) {
  $nodeExe = "$root\tools\node-portable\node.exe"; $env:Path = "$root\tools\node-portable;$env:Path"
}
if (-not $nodeExe -and (Test-Path 'H:\临时\tools\node\node.exe')) {
  $nodeExe = 'H:\临时\tools\node\node.exe'; $env:Path = "H:\临时\tools\node;$env:Path"
}
if (-not $nodeExe) { throw '找不到 node，无法构建（可先跑 hotfix\准备构建环境.ps1）' }

# 双构建要打临时补丁，要求 app/src 干净，避免把未提交改动打进包
git -C $root diff --quiet -- app/src
if ($LASTEXITCODE -ne 0) { throw 'app/src 有未提交改动，打包前请先提交或恢复' }

# 1) 双构建: 五线(封版原样) + 四线(方案A止血)
$stage = Join-Path $env:TEMP "mlr-stage-$stamp"
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory "$stage\five" -Force | Out-Null
New-Item -ItemType Directory "$stage\four" -Force | Out-Null

Push-Location "$root\app"
try {
  npm run build
  Copy-Item dist\* "$stage\five" -Recurse
  git -C $root apply "$root\hotfix\方案A_哨兵线下线.patch"
  try {
    npm run build
    Copy-Item dist\index.html, dist\r.html "$stage\four"
    Copy-Item dist\assets "$stage\four\assets" -Recurse
  } finally {
    # 无论构建成败都还原封版源码
    git -C $root apply -R "$root\hotfix\方案A_哨兵线下线.patch"
  }
} finally { Pop-Location }

# 2) 组装（app 主体=五线；四线的哈希资产并入 assets 两套共存，切换只换 html 入口）
$pkg = Join-Path $env:TEMP "mlr-pkg-$stamp"
if (Test-Path $pkg) { Remove-Item $pkg -Recurse -Force }
New-Item -ItemType Directory "$pkg\tools\node" -Force | Out-Null
New-Item -ItemType Directory "$pkg\standby\五线_原版" -Force | Out-Null
New-Item -ItemType Directory "$pkg\standby\方案A_四线" -Force | Out-Null

Copy-Item "$stage\five" "$pkg\app" -Recurse
Copy-Item "$stage\four\assets\*" "$pkg\app\assets" -Force
Copy-Item "$stage\five\index.html", "$stage\five\r.html" "$pkg\standby\五线_原版"
Copy-Item "$stage\four\index.html", "$stage\four\r.html" "$pkg\standby\方案A_四线"

Copy-Item "$root\deploy-kiosk\server.js" $pkg
Copy-Item "$root\deploy-kiosk\启动展台.bat" $pkg
Copy-Item "$root\deploy-kiosk\停止展台.bat" $pkg
Copy-Item "$root\deploy-kiosk\环境加固.bat" $pkg
Copy-Item "$root\deploy-kiosk\展台自检.bat" $pkg
Copy-Item "$root\deploy-kiosk\现场SOP.md" $pkg
Copy-Item "$root\deploy-kiosk\README_部署.md" $pkg
Copy-Item "$root\deploy-kiosk\切换_下线哨兵线.bat" "$pkg\standby"
Copy-Item "$root\deploy-kiosk\切换_恢复五线.bat" "$pkg\standby"
Copy-Item $nodeExe "$pkg\tools\node\node.exe"
Remove-Item $stage -Recurse -Force

# 3) 展台配置模板（补全模型接口全部字段，便于现场照着改）
@'
{
  "baseUrl": "http://127.0.0.1:1234/v1",
  "model": "local-model",
  "apiKey": "",
  "timeoutMs": 20000,
  "temperature": 0.9,
  "maxTokens": 700,
  "reportBase": "https://tiaozhuxiansheng.com/mlr/"
}
'@ | ForEach-Object { [System.IO.File]::WriteAllText("$pkg\app\config.json", $_, (New-Object System.Text.UTF8Encoding $false)) }
# ↑ 必须无 BOM：自检脚本用 node JSON.parse 校验，BOM 会导致解析失败误报

# 4) 压缩
$zip = Join-Path $root "镜像自我_展台部署包_${ver}_$stamp.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path "$pkg\*" -DestinationPath $zip
Remove-Item $pkg -Recurse -Force

$mb = [math]::Round((Get-Item $zip).Length/1MB, 1)
Write-Host "打包完成: $zip ($mb MB)"
