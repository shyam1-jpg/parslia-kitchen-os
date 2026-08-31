@echo off
title Outlook company folders (classic desktop Outlook)
cd /d "%~dp0"

echo.
echo  Classic desktop Outlook fallback
echo  ------------------------------------------
echo  Prefer FILE-ALL-EMAIL-FOLDERS.bat — that
echo  files Hotmail / outlook.live.com directly.
echo.
echo  1. Open desktop Outlook first
echo  2. Turn OFF "New Outlook" if you see it
echo  3. Then press any key here
echo.
pause >nul

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Setup-OutlookFolders.ps1"
if errorlevel 1 (
  echo.
  echo  Script could not talk to Outlook.
  echo  Use FILE-ALL-EMAIL-FOLDERS.bat instead.
  echo.
)
echo.
pause
