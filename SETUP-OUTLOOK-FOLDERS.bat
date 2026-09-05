@echo off
title Outlook company folders
cd /d "%~dp0outlook"
if not exist "Setup-OutlookFolders.ps1" (
  echo Could not find the outlook folder next to this file.
  pause
  exit /b 1
)
call "%~dp0outlook\SETUP-OUTLOOK-FOLDERS.bat"
