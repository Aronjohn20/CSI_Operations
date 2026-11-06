@echo off
set "PATH=R:\Hermes\Agent Data\node;%PATH%"
cd /d "%~dp0"
echo ========================================================
echo   Starting CSI Operations Local Development Server
echo ========================================================
echo   URL: http://localhost:3000
echo   Press Ctrl + C in this terminal to stop the server
echo ========================================================
npm run dev
pause

