@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 止血切换：哨兵线下线（四线版）

if not exist "方案A_四线\index.html" (echo [错误] 缺 方案A_四线\index.html，包不完整 & pause & exit /b 1)
copy /y "方案A_四线\index.html" "..\app\index.html" >nul
copy /y "方案A_四线\r.html" "..\app\r.html" >nul

echo 已切换为【四线版】：哨兵线下线，只出 画家/赛车手/音乐人/宇航员。
echo 展台屏幕按 F5 刷新即生效（服务无需重启）。
echo 验收：E2「换一扇门」应只有四扇门。
pause
