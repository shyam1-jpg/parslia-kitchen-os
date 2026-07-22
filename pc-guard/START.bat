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
echo  Starting PC Guard...
echo  The dashboard will open by itself when ready.
echo  If the page is blocked, double-click FIX-FIREWALL.bat
echo  then run START.bat again.
echo.
echo  Open in browser:
echo      http://127.0.0.1:8787
echo.
echo  Keep this black window OPEN while monitoring.
echo.

python app.py
set "ERR=%ERRORLEVEL%"
echo.
if not "%ERR%"=="0" (
  echo  PC Guard stopped with an error.
  echo  If firewall blocked it, run FIX-FIREWALL.bat as Administrator.
) else (
  echo  PC Guard stopped.
)
pause
