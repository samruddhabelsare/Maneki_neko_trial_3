@echo off
title Maneki Neko - Smart Restaurant
color 0B

echo ===================================================
echo     Maneki Neko Server Startup
echo ===================================================
echo.

:: Check if Node is installed
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in your PATH. 
    echo Please download and install Node.js from https://nodejs.org/
    echo Press any key to exit...
    pause >nul
    exit /b 1
)

:: Check if dependencies are installed
if not exist "node_modules\" (
    echo [INFO] First time setup: Installing dependencies...
    call npm install
    echo.
)

echo [INFO] Starting the local server...
echo [INFO] Your browser will open automatically in a few seconds.

:: Launch a background process to wait 3 seconds and then open the browser
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000"

:: Start the Node.js server
call npm start

pause
