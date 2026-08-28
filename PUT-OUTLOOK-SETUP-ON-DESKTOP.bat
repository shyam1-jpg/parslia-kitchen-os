@echo off
title Put Outlook folder setup on Desktop
set "DEST=%USERPROFILE%\Desktop\Outlook-Company-Folders"
mkdir "%DEST%" 2>nul
copy /Y "%~dp0OPEN-ME-OUTLOOK-FOLDERS.html" "%DEST%\OPEN-ME-OUTLOOK-FOLDERS.html" >nul
xcopy /E /I /Y "%~dp0outlook" "%DEST%\outlook" >nul
copy /Y "%~dp0SETUP-OUTLOOK-FOLDERS.bat" "%DEST%\SETUP-OUTLOOK-FOLDERS.bat" >nul
echo.
echo  Copied to your Desktop:
echo  %DEST%
echo.
echo  Double-click OPEN-ME-OUTLOOK-FOLDERS.html in that folder.
echo.
explorer "%DEST%"
pause
