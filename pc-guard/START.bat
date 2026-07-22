@echo off
title PC Guard
cd /d "%~dp0"

echo.
echo  ========================================
echo   PC Guard
echo   Opens a DESKTOP WINDOW (no Chrome)
echo  ========================================
echo.

where python >nul 2>&1
if errorlevel 1 (
  where py >nul 2>&1
  if errorlevel 1 (
    echo  Python not found.
    echo  Install from https://www.python.org/downloads/
    echo  Tick: Add python.exe to PATH
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
echo  Installing packages...
pip install -r requirements.txt
if errorlevel 1 (
  echo  Failed to install packages.
  pause
  exit /b 1
)

echo.
echo  Opening PC Guard window...
echo  Keep this black window OPEN.
echo  Use the green/white app window that appears.
echo  Click "Create test event" inside that window.
echo.

python desktop_ui.py
set "CODE=%ERRORLEVEL%"

if "%CODE%"=="2" (
  echo.
  echo  Desktop window failed ^(tkinter missing^).
  echo  Trying simple file mode instead...
  set "PC_GUARD_NO_BROWSER=0"
  python app.py
)

echo.
echo  PC Guard stopped.
pause
