@echo off
chcp 65001 >nul
title 停止展台服务

REM 杀守护窗口及其子进程 node（/T 连树杀，守护循环不会再拉起）
taskkill /FI "WINDOWTITLE eq MLR-Server*" /T /F >nul 2>&1

REM 只关本包独立配置目录（kiosk-profile）启动的 kiosk 浏览器，不误伤日常浏览器
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='chrome.exe' or Name='msedge.exe'\" | Where-Object {$_.CommandLine -like '*kiosk-profile*'} | ForEach-Object {Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue}" >nul 2>&1

echo 展台服务与 kiosk 浏览器已停止。
timeout /t 3 >nul
