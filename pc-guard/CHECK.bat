@echo off
title PC Guard Check
cd /d "%~dp0"

echo.
echo  ========================================
echo   PC Guard - CHECK if it works
echo  ========================================
echo.

if exist ".venv\Scripts\python.exe" (
  call .venv\Scripts\activate.bat
  python selftest.py
) else (
  where python >nul 2>&1
  if errorlevel 1 (
    py -3 selftest.py
  ) else (
    python selftest.py
  )
)

echo.
echo  If RESULT is good, double-click START.bat
echo  Then open http://127.0.0.1:8787
echo.
pause
