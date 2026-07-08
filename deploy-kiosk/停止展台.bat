@echo off
chcp 65001 >nul
title 停止展台服务
taskkill /FI "WINDOWTITLE eq MLR-Server*" /T /F >nul 2>&1
echo 展台服务已停止（浏览器窗口请用 Alt+F4 关闭）。
timeout /t 3 >nul
