@echo off
cd /d "%~dp0"
if not exist "data" mkdir data
if not exist "data\live.html" (
  echo ^<!DOCTYPE html^>^<html^>^<body style="font-family:Segoe UI;padding:2rem"^>^<h1^>Run DOUBLE-CLICK-ME first^</h1^>^<p^>Then open this file again.^</p^>^</body^>^</html^> > "data\live.html"
)
echo Opening LOCAL file (not internet):
echo %~dp0data\live.html
start "" "%~dp0data\live.html"
timeout /t 2 >nul
