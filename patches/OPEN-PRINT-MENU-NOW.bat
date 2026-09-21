@echo off
setlocal
title Print Menu Now
set "PAGE=%~dp0..\menu-creator\PRINT-NOW.html"
if not exist "%PAGE%" (
  echo Could not find PRINT-NOW.html
  pause
  exit /b 1
)
echo Opening Print Menu Now in your browser...
start "" "%PAGE%"
echo.
echo 1) Paste your menu
echo 2) Click Make menu
echo 3) Click Print / Save PDF
echo.
pause
