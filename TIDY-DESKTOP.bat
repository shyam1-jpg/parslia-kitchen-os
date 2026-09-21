@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Tidy Desktop — Parslia / Libraix / Kiteline
color 0A

set "DESK=%USERPROFILE%\Desktop"
if not exist "%DESK%" set "DESK=%USERPROFILE%\OneDrive\Desktop"

echo.
echo  ============================================
echo   TIDY DESKTOP — automatic file organizer
echo  ============================================
echo.
echo  Desktop folder:
echo  %DESK%
echo.
echo  This will:
echo   1. Create 6 tidy folders on your Desktop
echo   2. Move known project folders into them
echo   3. Move loose pictures, videos, docs, zips
echo.
echo  Nothing is deleted — only moved.
echo.
pause

cd /d "%DESK%" || (
  echo ERROR: Cannot open Desktop folder.
  pause
  exit /b 1
)

echo.
echo  [1/3] Creating folders...
mkdir "01-Parslia" 2>nul
mkdir "02-Libraix" 2>nul
mkdir "03-Kiteline" 2>nul
mkdir "04-Accounts-Passwords" 2>nul
mkdir "05-Media" 2>nul
mkdir "06-Archive" 2>nul
mkdir "01-Parslia\notes" 2>nul
mkdir "02-Libraix\notes" 2>nul
mkdir "03-Kiteline\notes" 2>nul
mkdir "05-Media\screenshots" 2>nul
mkdir "05-Media\videos" 2>nul
mkdir "05-Media\logos" 2>nul
mkdir "06-Archive\other-files" 2>nul

echo  [2/3] Moving known project folders...

call :MoveFolder "parslia-kitchen-os" "01-Parslia\parslia-kitchen-os"
call :MoveFolder "parslia-kitchen-os-main" "01-Parslia\parslia-kitchen-os-main"
call :MoveFolder "Parslia" "01-Parslia\Parslia-old"
call :MoveFolder "parslia" "01-Parslia\parslia-old"
call :MoveFolder "parslia-site" "06-Archive\parslia-site"
call :MoveFolder "parslia-brand" "05-Media\logos\parslia-brand"
call :MoveFolder "kitchen-os" "03-Kiteline\kitchen-os"
call :MoveFolder "kiteline" "03-Kiteline\kiteline"
call :MoveFolder "Kiteline" "03-Kiteline\Kiteline"
call :MoveFolder "kitline1" "03-Kiteline\kitline1"
call :MoveFolder "libraix" "02-Libraix\libraix"
call :MoveFolder "Libraix" "02-Libraix\Libraix"

echo  [3/3] Moving loose files by type...

REM --- Images / logos ---
for %%F in (*.png *.jpg *.jpeg *.gif *.webp *.svg *.ico *.bmp) do (
  if exist "%%F" (
    echo   image  -^> 05-Media\logos\  %%F
    move /Y "%%F" "05-Media\logos\" >nul 2>&1
  )
)

REM --- Videos ---
for %%F in (*.mp4 *.mov *.avi *.mkv *.webm *.wmv) do (
  if exist "%%F" (
    echo   video  -^> 05-Media\videos\  %%F
    move /Y "%%F" "05-Media\videos\" >nul 2>&1
  )
)

REM --- Screenshots (common Windows names) ---
for %%F in ("Screenshot*.png" "Screenshot*.jpg" "Screen Shot*.png") do (
  if exist %%F (
    echo   shot   -^> 05-Media\screenshots\  %%~nxF
    move /Y %%F "05-Media\screenshots\" >nul 2>&1
  )
)

REM --- Guides / passwords / notes ---
for %%F in (*password* *PASSWORD* *login* *LOGIN* *owner* *OWNER* *guide* *GUIDE* *checklist* *CHECKLIST*) do (
  if exist "%%F" if not "%%F"=="%~nx0" (
    echo   guide  -^> 04-Accounts-Passwords\  %%F
    move /Y "%%F" "04-Accounts-Passwords\" >nul 2>&1
  )
)

REM --- Documents ---
for %%F in (*.txt *.md *.doc *.docx *.pdf *.rtf *.csv *.xlsx *.xls) do (
  if exist "%%F" if /I not "%%F"=="%~nx0" (
    echo   doc    -^> 06-Archive\other-files\  %%F
    move /Y "%%F" "06-Archive\other-files\" >nul 2>&1
  )
)

REM --- Archives / installers ---
for %%F in (*.zip *.rar *.7z *.exe *.msi) do (
  if exist "%%F" if /I not "%%F"=="%~nx0" (
    echo   zip    -^> 06-Archive\other-files\  %%F
    move /Y "%%F" "06-Archive\other-files\" >nul 2>&1
  )
)

REM --- Shortcuts left alone (so Start menu / pinned items stay) ---
REM --- Move remaining loose files (not folders, not this script) ---
for %%F in (*.*) do (
  if /I not "%%~nxF"=="%~nx0" if /I not "%%~xF"==".lnk" if /I not "%%~xF"==".url" (
    if exist "%%F" (
      echo   other  -^> 06-Archive\other-files\  %%F
      move /Y "%%F" "06-Archive\other-files\" >nul 2>&1
    )
  )
)

REM Copy this script into Accounts so you can find it later
if exist "%~f0" (
  copy /Y "%~f0" "%DESK%\04-Accounts-Passwords\TIDY-DESKTOP.bat" >nul 2>&1
)

echo.
echo  ============================================
echo   DONE — Desktop is tidied
echo  ============================================
echo.
echo  You should now see mostly:
echo    01-Parslia
echo    02-Libraix
echo    03-Kiteline
echo    04-Accounts-Passwords
echo    05-Media
echo    06-Archive
echo.
echo  Open 06-Archive\other-files if something
echo  went to the wrong place — drag it back.
echo.
echo  Opening Desktop now...
explorer "%DESK%"
echo.
pause
exit /b 0

:MoveFolder
set "SRC=%~1"
set "DST=%~2"
if exist "%DESK%\%SRC%\" (
  if not exist "%DESK%\%DST%\" (
    echo   folder -^> %DST%
    move "%DESK%\%SRC%" "%DESK%\%DST%" >nul 2>&1
    if errorlevel 1 (
      mkdir "%DESK%\%DST%" 2>nul
      robocopy "%DESK%\%SRC%" "%DESK%\%DST%" /E /MOVE /NFL /NDL /NJH /NJS >nul
      rd /s /q "%DESK%\%SRC%" 2>nul
    )
  ) else (
    echo   skip   (already exists): %DST%
  )
)
exit /b 0
