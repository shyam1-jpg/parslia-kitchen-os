@echo off
:: Fix Windows Firewall blocking PC Guard / Python dashboard
:: Right-click -> Run as administrator  (or just double-click; it will ask)

title PC Guard - Firewall Fix
cd /d "%~dp0"

:: Re-launch as Administrator if needed
net session >nul 2>&1
if errorlevel 1 (
  echo.
  echo  Windows needs Administrator permission to fix the firewall.
  echo  Click YES on the next popup.
  echo.
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

echo.
echo  ========================================
echo   PC Guard - Fix Windows Firewall
echo  ========================================
echo.

set "VENV_PY=%~dp0.venv\Scripts\python.exe"
set "VENV_PYW=%~dp0.venv\Scripts\pythonw.exe"

echo  Removing old PC Guard firewall rules (if any)...
netsh advfirewall firewall delete rule name="PC Guard Dashboard" >nul 2>&1
netsh advfirewall firewall delete rule name="PC Guard Python" >nul 2>&1
netsh advfirewall firewall delete rule name="PC Guard Pythonw" >nul 2>&1
netsh advfirewall firewall delete rule name="PC Guard Port Range" >nul 2>&1

echo  Allowing local dashboard ports 8787-8806...
netsh advfirewall firewall add rule name="PC Guard Port Range" dir=in action=allow protocol=TCP localport=8787-8806 profile=any enable=yes >nul
netsh advfirewall firewall add rule name="PC Guard Dashboard" dir=in action=allow protocol=TCP localport=8787 profile=any enable=yes >nul

if exist "%VENV_PY%" (
  echo  Allowing PC Guard Python: %VENV_PY%
  netsh advfirewall firewall add rule name="PC Guard Python" dir=in action=allow program="%VENV_PY%" enable=yes profile=any >nul
  netsh advfirewall firewall add rule name="PC Guard Python" dir=out action=allow program="%VENV_PY%" enable=yes profile=any >nul
) else (
  echo  Note: .venv not created yet. Run START.bat once, then run this again.
)

if exist "%VENV_PYW%" (
  netsh advfirewall firewall add rule name="PC Guard Pythonw" dir=in action=allow program="%VENV_PYW%" enable=yes profile=any >nul
)

:: Also allow system python if found
for /f "delims=" %%P in ('where python 2^>nul') do (
  echo  Allowing system Python: %%P
  netsh advfirewall firewall add rule name="PC Guard System Python" dir=in action=allow program="%%P" enable=yes profile=any >nul
  goto :py_done
)
:py_done

echo.
echo  DONE. Firewall rules added.
echo.
echo  Next steps:
echo   1. Close any old PC Guard window
echo   2. Double-click START.bat
echo   3. Open http://127.0.0.1:8787
echo.
echo  If Windows showed "Allow access" before, choose:
echo   - Private networks  = YES / Allow
echo.
pause
