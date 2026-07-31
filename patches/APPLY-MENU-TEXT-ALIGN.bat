@echo off
setlocal
title Apply Menu Creator text-align fix
echo.
echo  Menu Creator — fix allergens mixed with menus + align text
echo  ==========================================================
echo.
echo  This updates Kiteline's Menu Creator on this PC.
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
if errorlevel 1 (
  echo  Copy failed.
  pause
  exit /b 1
)

echo  Done.
echo.
echo  Next:
echo   1. Restart Kiteline if it is running
echo   2. Open Menu Creator
echo   3. Hard refresh: Ctrl+Shift+R
echo   4. If dishes show under Allergen Information, click:
echo        Fix mixed allergens / move dishes to menu
echo   5. Add dishes with Add dish or Paste full menu
echo      (not into the allergen text box)
echo.
pause
