@echo off
title Parslia Kitchen OS — local preview
cd /d "%~dp0"
echo.
echo  Parslia landing page: http://localhost:8000
echo  Folder: %~dp0
echo  Press Ctrl+C to stop.
echo.
start "" "http://localhost:8000"
python -m http.server 8000
