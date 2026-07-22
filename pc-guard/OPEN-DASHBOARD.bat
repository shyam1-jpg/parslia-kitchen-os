@echo off
REM Open the dashboard if PC Guard is already running.
start "" "http://127.0.0.1:8787"
start "" "http://localhost:8787"
echo Tried to open http://127.0.0.1:8787
echo If the page fails, start PC Guard first with START.bat
timeout /t 4 >nul
