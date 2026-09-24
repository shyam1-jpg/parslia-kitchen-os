@echo off
title Put Outlook folder setup on Desktop
set "DEST=%USERPROFILE%\Desktop\Outlook-Company-Folders"
mkdir "%DEST%" 2>nul
copy /Y "%~dp0OPEN-ME-OUTLOOK-FOLDERS.html" "%DEST%\OPEN-ME-OUTLOOK-FOLDERS.html" >nul
copy /Y "%~dp0FILE-ALL-EMAIL-FOLDERS.bat" "%DEST%\FILE-ALL-EMAIL-FOLDERS.bat" >nul
copy /Y "%~dp0SETUP-OUTLOOK-FOLDERS.bat" "%DEST%\SETUP-OUTLOOK-FOLDERS.bat" >nul
xcopy /E /I /Y "%~dp0outlook" "%DEST%\outlook" >nul
echo.
echo  Copied to your Desktop:
echo  %DEST%
echo.
echo  Double-click FILE-ALL-EMAIL-FOLDERS.bat in that folder.
echo  Then open Outlook on the web and look LEFT.
echo.
explorer "%DEST%"
pause
