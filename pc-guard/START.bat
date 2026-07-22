@echo off
title PC Guard
cd /d "%~dp0"

echo.
echo  ========================================
echo   PC Guard - who used your PC + files
echo   (NO FIREWALL MODE - local file page)
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
echo  Starting PC Guard in NO-FIREWALL mode...
echo  A local page will open: data\live.html
echo  Keep this black window OPEN.
echo.
echo  To create a test event later: TEST-NOW.bat
echo.

python app.py
echo.
echo  PC Guard stopped.
pause
