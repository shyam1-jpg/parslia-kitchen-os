@echo off
cd /d "%~dp0"
if exist "data\live.html" (
  start "" "%~dp0data\live.html"
  echo Opened data\live.html
) else if exist "data\dashboard.url" (
  for /f "usebackq delims=" %%A in ("data\dashboard.url") do (
    start "" "%%A"
    echo Opening %%A
    goto :done
  )
) else (
  echo Dashboard not found yet.
  echo Run START.bat first and keep it open.
)
:done
timeout /t 3 >nul
