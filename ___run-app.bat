@echo off
setlocal
cd /d "%~dp0"
title Minecraft Localization Studio

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-app.ps1"
exit /b %errorlevel%
