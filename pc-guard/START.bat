@echo off
title PC Guard
cd /d "%~dp0"

echo.
echo  ========================================
echo   PC Guard - who used your PC + files
echo  ========================================
echo.

where python >nul 2>&1
if errorlevel 1 (
  echo  Python not found. Install from https://www.python.org/downloads/
  echo  Tick "Add python.exe to PATH" during install.
  pause
  exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
  echo  Creating virtual environment...
  python -m venv .venv
)

call .venv\Scripts\activate.bat
python -m pip install --upgrade pip >nul
pip install -r requirements.txt
if errorlevel 1 (
  echo  Failed to install packages.
  pause
  exit /b 1
)

echo.
echo  Screen shots are taken automatically when a file is used.
echo  Optional face photos: pip install opencv-python-headless
echo  Dashboard will open at http://127.0.0.1:8787
echo.

start "" http://127.0.0.1:8787
python app.py
pause
