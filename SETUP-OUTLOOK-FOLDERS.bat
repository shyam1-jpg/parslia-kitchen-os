@echo off
title Outlook company folders (classic desktop Outlook)
cd /d "%~dp0outlook"
if not exist "Setup-OutlookFolders.ps1" (
  echo Could not find the outlook folder next to this file.
  pause
  exit /b 1
)
echo.
echo  This is the classic Outlook fallback.
echo  Prefer FILE-ALL-EMAIL-FOLDERS.bat for Hotmail.
echo.
call "%~dp0outlook\SETUP-OUTLOOK-FOLDERS.bat"
