@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 镜像自我·人生预演 启动器

set PORT=8420
set URL=http://127.0.0.1:%PORT%

REM ---- 防重入：服务已在运行则跳过（双击两次不再撞端口）----
tasklist /fi "WINDOWTITLE eq MLR-Server*" 2>nul | find /i "cmd.exe" >nul
if not errorlevel 1 (
  echo [1/3] 服务已在运行，跳过启动
  goto probe
)

echo [1/3] 启动本地服务，端口 %PORT% ...
REM 守护循环：node 崩溃/被误杀后 2 秒自动拉起；停止展台.bat 会连守护一起杀
start "MLR-Server" /min cmd /c "for /l %%i in (0,0,1) do (tools\node\node.exe server.js %PORT% & timeout /t 2 /nobreak >nul)"

:probe
echo [2/3] 等待服务就绪 ...
set /a TRIES=0
:wait
curl -s -o nul --max-time 2 "%URL%/config.json" 2>nul && goto ready
set /a TRIES+=1
if %TRIES% geq 30 goto svcfail
timeout /t 1 /nobreak >nul
goto wait

:svcfail
echo.
echo [错误] 服务 30 秒未就绪。排查：
echo   1. 路径是否含中文/特殊字符（换到 D:\MLR\ 这类纯英文路径最稳）
echo   2. 杀毒软件是否拦截了 tools\node\node.exe
echo   3. 双击 展台自检.bat 查看具体问题
pause
exit /b 1

:ready
if /i "%~1"=="nobrowser" (
  echo [3/3] 已按参数跳过浏览器（排障模式），手动访问 %URL%
  goto done
)
echo [3/3] 启动 kiosk 全屏浏览器 ...
set BROWSER=
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" set "BROWSER=C:\Program Files\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" set "BROWSER=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" set "BROWSER=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
if defined BROWSER (
  start "" "%BROWSER%" --kiosk %URL% --autoplay-policy=no-user-gesture-required --disable-session-crashed-bubble --noerrdialogs --disable-infobars --no-first-run --user-data-dir="%~dp0kiosk-profile"
  goto done
)
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
  start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --kiosk %URL% --edge-kiosk-type=fullscreen --autoplay-policy=no-user-gesture-required --no-first-run --user-data-dir="%~dp0kiosk-profile"
) else (
  start "" msedge --kiosk %URL% --edge-kiosk-type=fullscreen --autoplay-policy=no-user-gesture-required --no-first-run
)

:done
echo.
echo 展台已启动: %URL%
echo 退出 kiosk: Alt+F4 ; 停止服务: 双击 停止展台.bat
echo 本地 AI（可选）: 先启动 LM Studio 并加载模型, 再改 app\config.json 的 baseUrl/model
timeout /t 5 >nul
