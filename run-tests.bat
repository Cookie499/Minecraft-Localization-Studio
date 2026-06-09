@echo off
setlocal
cd /d "%~dp0"
title Minecraft Localization Studio Tests

where node.exe >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or is not in PATH.
  echo Install Node.js LTS from https://nodejs.org/
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo [MLS] Installing dependencies...
  call npm.cmd install
  if errorlevel 1 goto :failed
)

echo.
echo [1/2] Running core tests...
call npm.cmd test
if errorlevel 1 goto :failed

echo.
echo [2/2] Building the web application...
call npm.cmd run build
if errorlevel 1 goto :failed

echo.
echo ========================================
echo ALL TESTS AND BUILD CHECKS PASSED
echo ========================================
pause
exit /b 0

:failed
echo.
echo ========================================
echo TEST OR BUILD FAILED
echo Review the error output above.
echo ========================================
pause
exit /b 1
