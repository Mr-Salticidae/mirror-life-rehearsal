@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 恢复五线（含哨兵线）

if not exist "五线_原版\index.html" (echo [错误] 缺 五线_原版\index.html，包不完整 & pause & exit /b 1)
copy /y "五线_原版\index.html" "..\app\index.html" >nul
copy /y "五线_原版\r.html" "..\app\r.html" >nul

echo 已恢复【五线原版】（含哨兵线）。
echo 展台屏幕按 F5 刷新即生效（服务无需重启）。
pause
