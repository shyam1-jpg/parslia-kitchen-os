@echo off
title PC Guard WEB mode
cd /d "%~dp0"
echo.
echo  WEB mode uses http://127.0.0.1:8787
echo  If firewall blocks it, use START.bat instead.
echo.
if not exist ".venv\Scripts\python.exe" (
  echo  Run START.bat once first to install packages.
  pause
  exit /b 1
)
call .venv\Scripts\activate.bat
python app.py --web
pause
