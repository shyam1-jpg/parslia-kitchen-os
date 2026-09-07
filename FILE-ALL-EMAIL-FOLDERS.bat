@echo off
title File all company email into Outlook folders
cd /d "%~dp0"

echo.
echo  File all company email
echo  ------------------------------------------
echo  Signs into Hotmail / Outlook on the web
echo  (shyam_1@hotmail.co.uk), creates a folder
echo  for each company, moves the mail, and adds
echo  rules for new mail. Friends stay in Inbox.
echo.
echo  A sign-in code will appear next.
echo.

if not exist "%~dp0outlook\File-AllCompanyMail.ps1" (
  echo  Could not find outlook\File-AllCompanyMail.ps1
  echo  Put this .bat next to the outlook folder.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0outlook\File-AllCompanyMail.ps1"
if errorlevel 1 (
  echo.
  echo  Hotmail sign-in did not finish.
  echo  If you have classic desktop Outlook, the
  echo  fallback script will try that next.
  echo.
  pause
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0outlook\Setup-OutlookFolders.ps1"
  if errorlevel 1 (
    echo.
    echo  Could not file mail automatically.
    echo  Open OPEN-ME-OUTLOOK-FOLDERS.html
    echo  and follow the Outlook on the web steps.
    echo.
  )
)

echo.
pause
