@echo off
title Outlook company folders
cd /d "%~dp0"

echo.
echo  Outlook company folders
echo  ------------------------------------------
echo  Creates folders for GitHub, Cursor, Cloud,
echo  Apple, Google, and other companies.
echo  New mail from those companies drops in the
echo  matching folder. Friends stay in Inbox.
echo.
echo  1. Open desktop Outlook first
echo  2. Then press any key here
echo.
pause >nul

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Setup-OutlookFolders.ps1"
if errorlevel 1 (
  echo.
  echo  Script could not talk to Outlook.
  echo  Read START-HERE.txt for the click-by-click
  echo  Outlook on the web steps instead.
  echo.
)
echo.
pause
