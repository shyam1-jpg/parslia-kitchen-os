@echo off
cd /d "%~dp0"
if exist "data\dashboard.url" (
  for /f "usebackq delims=" %%A in ("data\dashboard.url") do (
    start "" "%%A"
    echo Opening %%A
    goto :done
  )
)
start "" "http://127.0.0.1:8787"
echo Tried http://127.0.0.1:8787
echo If it fails, run START.bat first.
:done
timeout /t 4 >nul
