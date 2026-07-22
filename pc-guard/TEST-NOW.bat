@echo off
title PC Guard - create test event
cd /d "%~dp0"
if not exist "watched" mkdir watched
set "F=watched\TEST_%DATE:~-4%%DATE:~3,2%%DATE:~0,2%_%RANDOM%.txt"
echo PC Guard test file created at %DATE% %TIME%> "%F%"
echo Created: %F%
echo If PC Guard is running, this should appear in the dashboard.
timeout /t 3 >nul
