# 一键部署内测预览：构建 app/dist 并强推到公开预览仓库（GitHub Pages）
# 预览地址: https://mr-salticidae.github.io/mirror-life-rehearsal-preview/
# 说明: 预览仓库只存构建产物, 每次部署覆盖历史; 源码/剧本/协作文档均不出私有主仓库
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

Push-Location "$root\app"
npm run build
Pop-Location

$tmp = Join-Path $env:TEMP ("mlr-preview-" + [guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory -Path $tmp | Out-Null
Copy-Item "$root\app\dist\*" $tmp -Recurse
New-Item -ItemType File -Path "$tmp\.nojekyll" | Out-Null

$sha = git -C $root rev-parse --short HEAD
Push-Location $tmp
git init -q -b main
git add -A
git commit -q -m "内测预览部署 $sha"
git remote add origin https://github.com/Mr-Salticidae/mirror-life-rehearsal-preview.git
git push -q -f origin main
Pop-Location
Remove-Item -Recurse -Force $tmp

Write-Host "已部署 (源 $sha): https://mr-salticidae.github.io/mirror-life-rehearsal-preview/  (Pages 构建约需 1 分钟)"
