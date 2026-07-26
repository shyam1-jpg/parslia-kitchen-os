@echo off
setlocal EnableExtensions
title Kiteline ChatGPT fix + logo (do it all)

rem Applies connector 1.2.2 to local kitline1, pushes, opens GPT editor + logo.
rem Run on the PC where you are logged into GitHub (kitline1) and ChatGPT.

set "ROOT=%~dp0"
set "LOGO=%ROOT%chatgpt-gpt-logo.png"
set "PATCH=%ROOT%kiteline-chatgpt-logo-cors-1.2.2.patch"

echo.
echo === Kiteline ChatGPT: apply fix, deploy, open logo upload ===
echo.

if not exist "%LOGO%" (
  echo ERROR: Missing logo: %LOGO%
  pause
  exit /b 1
)

set "KIT="
if exist "%USERPROFILE%\Desktop\kitline1\.git" set "KIT=%USERPROFILE%\Desktop\kitline1"
if exist "%USERPROFILE%\Desktop\kiteline\kitline1\.git" set "KIT=%USERPROFILE%\Desktop\kiteline\kitline1"
if exist "%USERPROFILE%\Documents\kitline1\.git" set "KIT=%USERPROFILE%\Documents\kitline1"
if exist "C:\Users\shyam prasad\Desktop\kitline1\.git" set "KIT=C:\Users\shyam prasad\Desktop\kitline1"

if "%KIT%"=="" (
  echo Could not find kitline1 folder automatically.
  set /p KIT=Paste full path to your kitline1 repo:
)

if not exist "%KIT%\.git" (
  echo ERROR: Not a git repo: %KIT%
  pause
  exit /b 1
)

echo Using kitline1 at:
echo   %KIT%
echo.

pushd "%KIT%" || exit /b 1

git fetch origin
git checkout main
git pull origin main
git checkout -B cursor/chatgpt-cors-logo-4a85

echo Copying fixed files...
copy /Y "%ROOT%server\server.js" "server\server.js" >nul
copy /Y "%ROOT%server\security.js" "server\security.js" >nul
copy /Y "%ROOT%server\ai-openapi.js" "server\ai-openapi.js" >nul
copy /Y "%ROOT%server\ai-mcp.js" "server\ai-mcp.js" >nul
copy /Y "%ROOT%server\ai-connector.js" "server\ai-connector.js" >nul
if not exist "site" mkdir site
copy /Y "%ROOT%site\chatgpt.html" "site\chatgpt.html" >nul
copy /Y "%LOGO%" "chatgpt-gpt-logo.png" >nul
copy /Y "%LOGO%" "site\chatgpt-gpt-logo.png" >nul
copy /Y "%ROOT%CHATGPT.md" "CHATGPT.md" >nul

git add server/server.js server/security.js server/ai-openapi.js server/ai-mcp.js server/ai-connector.js site/chatgpt.html chatgpt-gpt-logo.png site/chatgpt-gpt-logo.png CHATGPT.md
git commit -m "Fix ChatGPT Something went wrong (CORS) + add GPT logo"
if errorlevel 1 (
  echo Nothing new to commit, or commit failed. Continuing push/open steps...
)

echo Pushing branch to GitHub...
git push -u origin cursor/chatgpt-cors-logo-4a85
if errorlevel 1 (
  echo.
  echo PUSH FAILED. Sign in to GitHub in this terminal / Git Credential Manager, then re-run.
  popd
  pause
  exit /b 1
)

echo.
echo Opening GitHub compare / PR page...
start "" "https://github.com/shyam1-jpg/kitline1/compare/main...cursor/chatgpt-cors-logo-4a85?expand=1"

echo Opening ChatGPT GPT editor...
start "" "https://chatgpt.com/gpts/editor/g-6a65392fc7b88191923de8c0e7094f71"

echo Opening logo folder for upload...
start "" explorer /select,"%LOGO%"

popd

echo.
echo === Almost done — 60 seconds in the browser ===
echo 1. On GitHub: create the PR and merge to main (Render redeploys kiteline.uk)
echo 2. In ChatGPT GPT editor - Configure: click logo circle, upload chatgpt-gpt-logo.png, Save
echo 3. Actions: re-import https://kiteline.uk/api/ai/openapi.json with your kl_ai_ token
echo 4. After deploy: curl https://kiteline.uk/api/ai/health  (expect version 1.2.2)
echo.
pause
endlocal
