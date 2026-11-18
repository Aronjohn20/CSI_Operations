@echo off
set "PATH=R:\BACKUP\Hermes\Agent Data\node;R:\Hermes\Agent Data\node;%PATH%"
cd /d "%~dp0"
echo ========================================================
echo   Starting CSI Operations Local Development Server
echo ========================================================
echo   URL: http://localhost:3000
echo   Press Ctrl + C in this terminal to stop the server
echo ========================================================
npm run dev
pause

