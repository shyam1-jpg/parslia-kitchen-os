@echo off
setlocal
REM Apply kitline1-clock-pin-fix.patch into a sibling or given kitline1 folder.
set PATCH=%~dp0kitline1-clock-pin-fix.patch
if not "%~1"=="" (
  set KIT=%~1
) else if exist "%~dp0..\..\kitline1\.git" (
  set KIT=%~dp0..\..\kitline1
) else if exist "%USERPROFILE%\Desktop\kitline1\.git" (
  set KIT=%USERPROFILE%\Desktop\kitline1
) else if exist "%USERPROFILE%\Desktop\kitchen-os\.git" (
  set KIT=%USERPROFILE%\Desktop\kitchen-os
) else (
  echo Could not find kitline1 / kitchen-os checkout.
  echo Usage: APPLY-CLOCK-PIN-FIX.bat C:\path\to\kitline1
  exit /b 1
)
echo Applying patch to %KIT%
pushd "%KIT%"
git apply "%PATCH%"
if errorlevel 1 (
  echo Patch failed. Repo may already include the fix, or paths differ.
  popd
  exit /b 1
)
git add js/store.js js/views.js server/starter-pack.js sw.js
git commit -m "Fix Wrong PIN on Clock In/Out for demo staff"
echo Done. Push this branch to GitHub/Render, then hard-refresh Ctrl+Shift+R.
popd
