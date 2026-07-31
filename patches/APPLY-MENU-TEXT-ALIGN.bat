@echo off
setlocal
title Apply Menu Creator simple-v1
echo.
echo  Menu Creator — simple mode (weekly menu removed)
echo  ================================================
echo.
echo  Updates Kiteline Menu Creator on this PC.
echo  Calendar lunch/dinner saves are kept.
echo.

set "KITELINE="
if exist "%~dp0..\..\kitline1\site\menu-creator\index.html" set "KITELINE=%~dp0..\..\kitline1"
if exist "%USERPROFILE%\Desktop\kitline1\site\menu-creator\index.html" set "KITELINE=%USERPROFILE%\Desktop\kitline1"
if exist "%USERPROFILE%\Desktop\kiteline\site\menu-creator\index.html" set "KITELINE=%USERPROFILE%\Desktop\kiteline"

if "%KITELINE%"=="" (
  echo  Could not find kitline1 folder automatically.
  echo  Drag your kitline1 folder onto this window, then press Enter:
  set /p KITELINE=Path:
)

if not exist "%KITELINE%\site\menu-creator\index.html" (
  echo  ERROR: No site\menu-creator\index.html under:
  echo  %KITELINE%
  pause
  exit /b 1
)

echo  Target: %KITELINE%\site\menu-creator\
echo.
copy /Y "%~dp0menu-creator-dropin\index.html" "%KITELINE%\site\menu-creator\index.html" >nul
copy /Y "%~dp0menu-creator-dropin\service-worker.js" "%KITELINE%\site\menu-creator\service-worker.js" >nul
if exist "%~dp0..\menu-creator\PRINT-NOW.html" copy /Y "%~dp0..\menu-creator\PRINT-NOW.html" "%KITELINE%\site\menu-creator\PRINT-NOW.html" >nul
if errorlevel 1 (
  echo  Copy failed.
  pause
  exit /b 1
)

echo  Done.
echo.
echo  Next:
echo   1. Restart Kiteline
echo   2. Open Menu Creator
echo   3. Ctrl+Shift+R
echo   4. Confirm: Build simple-v1
echo   5. Paste menu - Generate - Print
echo.
echo  Or open PRINT-NOW.html in the menu-creator folder to print now.
echo.
pause
