@echo off
title PC Guard
cd /d "%~dp0"

echo.
echo  ========================================
echo   PC Guard - who used your PC + files
echo   LOCAL FILE MODE - no internet needed
echo  ========================================
echo.
echo  Do NOT open http://127.0.0.1 in Chrome.
echo  This app opens a normal file: data\live.html
echo.

where python >nul 2>&1
if errorlevel 1 (
  where py >nul 2>&1
  if errorlevel 1 (
    echo  Python not found.
    echo  Install from https://www.python.org/downloads/
    echo  During install, TICK: "Add python.exe to PATH"
    echo.
    start https://www.python.org/downloads/
    pause
    exit /b 1
  )
  set "PY=py -3"
) else (
  set "PY=python"
)

if not exist "data" mkdir data
if not exist "data\snapshots" mkdir data\snapshots
if not exist "watched" mkdir watched

:: Always create/open a local HTML file first (never http://)
if not exist "data\live.html" (
  echo ^<!DOCTYPE html^>^<html^>^<head^>^<meta charset="utf-8"^>^<title^>PC Guard^</title^>^</head^>^<body style="font-family:Segoe UI;padding:2rem"^>^<h1^>PC Guard is starting...^</h1^>^<p^>Keep the black START window open.^</p^>^<p^>This page will refresh when ready.^</p^>^<meta http-equiv="refresh" content="3"^>^</body^>^</html^> > "data\live.html"
)

echo  Opening local file dashboard (NOT a website)...
start "" "%~dp0data\live.html"
start "" "%~dp0DASHBOARD.html"

if not exist ".venv\Scripts\python.exe" (
  echo  First run: creating virtual environment...
  %PY% -m venv .venv
  if errorlevel 1 (
    echo  Failed to create .venv
    pause
    exit /b 1
  )
)

call .venv\Scripts\activate.bat
python -m pip install --upgrade pip >nul
echo  Installing packages (first run may take a minute)...
pip install -r requirements.txt
if errorlevel 1 (
  echo  Failed to install packages.
  pause
  exit /b 1
)

echo.
echo  Starting monitor...
echo  Keep this black window OPEN.
echo  Dashboard file: %~dp0data\live.html
echo  Test later with: TEST-NOW
echo.

:: Tell Python not to open http:// anything; bat already opened the file
set "PC_GUARD_NO_BROWSER=1"
python app.py
echo.
echo  PC Guard stopped.
echo  Reminder: open data\live.html   (not http://127.0.0.1)
pause
