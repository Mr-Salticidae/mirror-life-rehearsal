@echo off
chcp 65001 >nul
title 展台环境加固
echo ===== 展台机环境加固（建议右键→以管理员身份运行）=====
net session >nul 2>&1
if errorlevel 1 echo [提示] 当前非管理员身份，Windows 更新暂停可能失败，其余项不受影响
echo.

echo [1/4] 电源计划：从不睡眠 / 从不关屏 / 从不关硬盘 ...
powercfg /change monitor-timeout-ac 0
powercfg /change standby-timeout-ac 0
powercfg /change disk-timeout-ac 0
powercfg /change hibernate-timeout-ac 0
echo        完成

echo [2/4] 关闭屏幕保护 ...
reg add "HKCU\Control Panel\Desktop" /v ScreenSaveActive /t REG_SZ /d 0 /f >nul
echo        完成

echo [3/4] Windows 更新暂停 7 天（展期中途弹重启框是经典事故）...
powershell -NoProfile -Command "$s=(Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ');$e=(Get-Date).AddDays(7).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ');$k='HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings';try{foreach($p in 'PauseFeatureUpdatesStartTime','PauseQualityUpdatesStartTime','PauseUpdatesStartTime'){Set-ItemProperty -Path $k -Name $p -Value $s -ErrorAction Stop};foreach($p in 'PauseFeatureUpdatesEndTime','PauseQualityUpdatesEndTime','PauseUpdatesExpiryTime'){Set-ItemProperty -Path $k -Name $p -Value $e -ErrorAction Stop};Write-Host ('       已暂停至 '+$e)}catch{Write-Host '       [失败] 需管理员身份；或到 设置→Windows 更新→暂停更新 手动操作'}"

echo [4/4] 以下项脚本无法代劳，请手动确认：
echo        - 专注助手设为「仅闹钟」（设置→系统→通知→勿扰模式）
echo        - 任务栏自动隐藏（任务栏右键→任务栏设置）
echo        - 浏览器访问 chrome://gpu 确认 WebGL / 硬件加速 enabled
echo        - 音量合成器确认浏览器未被单独静音，按展馆噪音调整总音量
echo.
echo ===== 加固完成 =====
pause
