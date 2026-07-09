@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 展台自检
set PORT=8420
echo ===== 展台自检 =====

if exist tools\node\node.exe (echo [OK]   便携 Node 就位) else (echo [FAIL] tools\node\node.exe 缺失，包不完整)

if exist app\index.html (echo [OK]   应用本体就位) else (echo [FAIL] app\index.html 缺失，包不完整)

tools\node\node.exe -e "JSON.parse(require('fs').readFileSync('app/config.json','utf8'))" >nul 2>&1
if not errorlevel 1 (echo [OK]   config.json 格式正确) else (echo [FAIL] app\config.json 缺失或 JSON 格式错误)

tools\node\node.exe -e "console.log('       reportBase = ' + (JSON.parse(require('fs').readFileSync('app/config.json','utf8')).reportBase || '(未配置, 走内置默认)'))" 2>nul

set STILLS=0
for /f %%n in ('dir /b app\stills 2^>nul ^| find /c /v ""') do set STILLS=%%n
if %STILLS% geq 52 (echo [OK]   剧照 %STILLS% 张) else (echo [WARN] 剧照仅 %STILLS% 张，应为 52 张)

set VIDEOS=0
for /f %%n in ('dir /b app\videos 2^>nul ^| find /c /v ""') do set VIDEOS=%%n
if %VIDEOS% geq 26 (echo [OK]   动态剧照 %VIDEOS% 个) else (echo [WARN] 动态剧照仅 %VIDEOS% 个，应为 26 个，缺失时静图兜底不致命)

curl -s -o nul --max-time 2 "http://127.0.0.1:%PORT%/config.json" 2>nul
if not errorlevel 1 (echo [OK]   服务响应正常，端口 %PORT%) else (echo [INFO] 服务未运行——先双击 启动展台.bat 再自检可覆盖此项)

fc /b app\index.html standby\五线_原版\index.html >nul 2>&1
if not errorlevel 1 (
  echo [INFO] 当前版本: 五线原版（含哨兵线）
) else (
  fc /b app\index.html standby\方案A_四线\index.html >nul 2>&1
  if not errorlevel 1 (echo [INFO] 当前版本: 四线止血版（哨兵线已下线）) else (echo [WARN] 当前版本无法识别，与 standby 两版均不一致)
)

echo ====================
echo 全部 OK 即可开摊；FAIL 项按 README_部署.md 故障速查处理
pause
