# 展台一键部署包打包脚本
# 产物: 仓库根目录 ..\镜像自我_展台部署包_vX.zip（含构建产物+便携Node+启动脚本+说明）
# 前提: 本机可构建（node 在 PATH 或 H:\临时\tools\node）
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent   # 仓库根
$ver = 'v1.0'
$stamp = Get-Date -Format 'yyyyMMdd'

# 0) 定位 node（PATH 优先，回退便携目录）
$nodeExe = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $nodeExe -and (Test-Path 'H:\临时\tools\node\node.exe')) { $nodeExe = 'H:\临时\tools\node\node.exe'; $env:Path = "H:\临时\tools\node;$env:Path" }
if (-not $nodeExe) { throw '找不到 node，无法构建' }

# 1) 构建
Push-Location "$root\app"
npm run build
Pop-Location

# 2) 组装
$pkg = Join-Path $env:TEMP "mlr-pkg-$stamp"
if (Test-Path $pkg) { Remove-Item $pkg -Recurse -Force }
New-Item -ItemType Directory "$pkg\tools\node" -Force | Out-Null
Copy-Item "$root\app\dist" "$pkg\app" -Recurse
Copy-Item "$root\deploy-kiosk\server.js" $pkg
Copy-Item "$root\deploy-kiosk\启动展台.bat" $pkg
Copy-Item "$root\deploy-kiosk\停止展台.bat" $pkg
Copy-Item "$root\deploy-kiosk\README_部署.md" $pkg
Copy-Item $nodeExe "$pkg\tools\node\node.exe"

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
'@ | Out-File "$pkg\app\config.json" -Encoding utf8

# 4) 压缩
$zip = Join-Path $root "镜像自我_展台部署包_${ver}_$stamp.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path "$pkg\*" -DestinationPath $zip
Remove-Item $pkg -Recurse -Force

$mb = [math]::Round((Get-Item $zip).Length/1MB, 1)
Write-Host "打包完成: $zip ($mb MB)"
