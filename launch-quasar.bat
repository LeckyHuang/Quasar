@echo off
:: QUASAR — double-click to start (Windows)
cd /d "%~dp0"

:: Kill any process on port 3000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000"') do (
  taskkill /F /PID %%a >nul 2>&1
)

:: Start dev server in background
start /B npm run dev

:: Wait for server to be ready (up to 30s)
set /a count=0
:wait
timeout /t 2 /nobreak >nul
curl -s -o nul http://localhost:3000/
if %errorlevel%==0 goto open
set /a count+=1
if %count% lss 15 goto wait

:open
start http://localhost:3000
