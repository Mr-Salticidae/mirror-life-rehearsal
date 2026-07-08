@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 镜像自我·人生预演 启动器

set PORT=8420
set URL=http://127.0.0.1:%PORT%

echo [1/3] 启动本地服务 (端口 %PORT%) ...
start "MLR-Server" /min tools\node\node.exe server.js %PORT%

echo [2/3] 等待服务就绪 ...
ping -n 3 127.0.0.1 >nul

echo [3/3] 启动 kiosk 全屏浏览器 ...
set CHROME_A="C:\Program Files\Google\Chrome\Application\chrome.exe"
set CHROME_B="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if exist %CHROME_A% (
  start "" %CHROME_A% --kiosk %URL% --autoplay-policy=no-user-gesture-required --disable-session-crashed-bubble --noerrdialogs --disable-infobars
) else if exist %CHROME_B% (
  start "" %CHROME_B% --kiosk %URL% --autoplay-policy=no-user-gesture-required --disable-session-crashed-bubble --noerrdialogs --disable-infobars
) else (
  start "" msedge --kiosk %URL% --edge-kiosk-type=fullscreen --autoplay-policy=no-user-gesture-required --no-first-run
)

echo.
echo 展台已启动: %URL%
echo 退出 kiosk: Alt+F4 ; 停止服务: 双击 停止展台.bat
echo 本地 AI(可选): 先启动 LM Studio 并加载模型, 再改 app\config.json 的 baseUrl/model
timeout /t 5 >nul
