@echo off
title Short Break System - Portable
echo ==========================================
echo   STARTING SHORT BREAK SYSTEM
echo ==========================================
echo.
echo 1. Checking dependencies...
if not exist "node_modules" (
    echo [!] First time setup detected. Installing dependencies...
    npm run setup
)
echo.
echo 2. Launching Server and Client...
echo    Access Dashboard via: http://localhost:5173
echo    Access via Intranet: Check the 'Network' IP below.
echo.
npm start
pause