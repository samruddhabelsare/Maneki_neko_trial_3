@echo off
setlocal enabledelayedexpansion
title Maneki Neko Smart Restaurant - Server Manager
color 0A

:: Force the window to stay open no matter what
if "%1" neq "___internal___" (
    cmd /k "%~f0" ___internal___
    exit
)

cls
echo.
echo  +================================================================+
echo  ^|                                                                ^|
echo  ^|        MANEKI NEKO - SMART RESTAURANT SYSTEM                  ^|
echo  ^|                                                                ^|
echo  ^|                    Server Startup Manager                      ^|
echo  ^|                                                                ^|
echo  +================================================================+
echo.
echo  +----------------------------------------------------------------+
echo  ^|  Starting system checks...                                     ^|
echo  +----------------------------------------------------------------+
echo.

:: --- WORKING DIRECTORY ---
echo  [0/7] Initializing workspace...
cd /d "%~dp0"
echo        OK - Directory: %CD%
echo.
timeout /t 1 /nobreak >nul

:: --- NODE.JS CHECK ---
echo  [1/7] Checking Node.js installation...
where node >nul 2>&1
if !errorlevel! neq 0 (
    color 0C
    echo        ERROR - Node.js not found in PATH
    echo.
    echo        Please install Node.js from: https://nodejs.org/
    echo.
    pause
    exit
)
for /f "tokens=*" %%i in ('node --version 2^>nul') do set NODE_VERSION=%%i
if "!NODE_VERSION!"=="" (
    color 0C
    echo        ERROR - Could not detect Node.js version
    pause
    exit
)
echo        OK - Node.js !NODE_VERSION! detected
echo.
timeout /t 1 /nobreak >nul

:: --- NPM CHECK ---
echo  [2/7] Checking npm package manager...
where npm >nul 2>&1
if !errorlevel! neq 0 (
    color 0C
    echo        ERROR - npm not found
    echo        npm should be included with Node.js
    echo.
    pause
    exit
)
for /f "tokens=*" %%i in ('npm --version 2^>nul') do set NPM_VERSION=%%i
if "!NPM_VERSION!"=="" (
    color 0C
    echo        ERROR - Could not detect npm version
    pause
    exit
)
echo        OK - npm v!NPM_VERSION! ready
echo.
timeout /t 1 /nobreak >nul

:: --- DEPENDENCIES CHECK ---
echo  [3/7] Checking project dependencies...
if not exist "node_modules" (
    color 0E
    echo        WARNING - node_modules not found
    echo        Installing dependencies... (this may take a few minutes)
    echo.
    call npm install
    if !errorlevel! neq 0 (
        color 0C
        echo.
        echo        ERROR - Dependency installation failed
        echo.
        pause
        exit
    )
    color 0A
    echo.
    echo        OK - All dependencies installed successfully
) else if not exist "node_modules\express" (
    color 0E
    echo        WARNING - Express framework missing
    echo        Installing dependencies...
    echo.
    call npm install
    if !errorlevel! neq 0 (
        color 0C
        echo.
        echo        ERROR - Dependency installation failed
        echo.
        pause
        exit
    )
    color 0A
    echo.
    echo        OK - All dependencies installed successfully
) else (
    echo        OK - All dependencies present
)
echo.
timeout /t 1 /nobreak >nul

:: --- .ENV CHECK ---
echo  [4/7] Checking environment configuration...
if not exist ".env" (
    color 0E
    echo        WARNING - .env file not found
    echo        Creating default configuration...
    (
      echo PORT=3000
      echo NVIDIA_API_KEY=YOUR_NVIDIA_API_KEY_HERE
      echo ELEVENLABS_API_KEY=YOUR_ELEVENLABS_API_KEY_HERE
      echo SUPABASE_URL=putfuckingurlhere
      echo SUPABASE_ANON_KEY=putfuckingkeyhere
    ) > .env
    color 0A
    echo        OK - Configuration file created
    echo        NOTE: Remember to add your API keys later!
) else (
    echo        OK - Configuration file loaded
)
echo.
timeout /t 1 /nobreak >nul

:: --- DB CHECK ---
echo  [5/7] Testing database connection...
if exist "check_db.js" (
    echo        Connecting to database...
    node check_db.js 2>nul
    if !errorlevel! neq 0 (
        color 0E
        echo        WARNING - Database check failed (continuing anyway)
        color 0A
    ) else (
        echo        OK - Database connection verified
    )
) else (
    echo        SKIP - Database check script not found
)
echo.
timeout /t 1 /nobreak >nul

:: --- SERVER FILE CHECK ---
echo  [6/7] Checking server files...
if not exist "server.js" (
    color 0C
    echo        ERROR - server.js not found!
    echo        Expected: %CD%\server.js
    echo.
    pause
    exit
)
echo        OK - server.js found
echo.
timeout /t 1 /nobreak >nul

:: --- CHECK FOR INDEX.HTML ---
echo  [7/7] Checking web interface...
if not exist "index.html" (
    color 0C
    echo        ERROR - index.html not found!
    echo        Expected: %CD%\index.html
    echo.
    pause
    exit
)
echo        OK - index.html found
echo.
timeout /t 1 /nobreak >nul

:: --- SUMMARY ---
echo.
echo  +================================================================+
echo  ^|                   ALL CHECKS PASSED                            ^|
echo  +================================================================+
echo.
echo  +----------------------------------------------------------------+
echo  ^|  System Summary:                                               ^|
echo  +----------------------------------------------------------------+
echo  ^|  Node.js Version    : !NODE_VERSION!
echo  ^|  npm Version        : v!NPM_VERSION!
echo  ^|  Dependencies       : Ready
echo  ^|  Environment        : Configured
echo  ^|  Database           : Checked
echo  ^|  Server Script      : Found
echo  ^|  Web Interface      : Found
echo  +----------------------------------------------------------------+
echo.

:: --- COUNTDOWN ---
color 0D
echo  Auto-starting server in...
echo.
timeout /t 1 /nobreak >nul
echo    5...
timeout /t 1 /nobreak >nul
echo    4...
timeout /t 1 /nobreak >nul
echo    3...
timeout /t 1 /nobreak >nul
echo    2...
timeout /t 1 /nobreak >nul
echo    1...
timeout /t 1 /nobreak >nul

cls
color 0A

:: --- LAUNCH SERVER ---
echo.
echo  +================================================================+
echo  ^|                                                                ^|
echo  ^|              NODE.JS SERVER IS STARTING                        ^|
echo  ^|                                                                ^|
echo  +================================================================+
echo.
echo  +----------------------------------------------------------------+
echo  ^|  Server Configuration:                                         ^|
echo  +----------------------------------------------------------------+
echo  ^|  Port     : 3000                                               ^|
echo  ^|  Status   : Launching...                                       ^|
echo  +----------------------------------------------------------------+
echo.
echo  +----------------------------------------------------------------+
echo  ^|  Access Your Application:                                      ^|
echo  +----------------------------------------------------------------+
echo  ^|                                                                ^|
echo  ^|  Customer App  --^>  http://localhost:3000/customer/            ^|
echo  ^|  Admin Panel   --^>  http://localhost:3000/admin/               ^|
echo  ^|  Kitchen (KDS) --^>  http://localhost:3000/kds/                 ^|
echo  ^|  Main Page     --^>  http://localhost:3000/                     ^|
echo  ^|                                                                ^|
echo  +----------------------------------------------------------------+
echo.
echo  Opening browser in 3 seconds...
echo.

:: Open browser after 3 seconds (in background)
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000/"

echo  +================================================================+
echo  ^|              SERVER IS NOW RUNNING                             ^|
echo  +================================================================+
echo.
echo  Server logs will appear below
echo  Press Ctrl+C to stop the server
echo.
echo  ----------------------------------------------------------------
echo.

:: Start the Node.js server
node server.js

:: This part runs only when server stops
color 0C
echo.
echo.
echo  +================================================================+
echo  ^|              SERVER STOPPED                                    ^|
echo  +================================================================+
echo.
echo  Press any key to close this window...
pause >nul
