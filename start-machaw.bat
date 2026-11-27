@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
    echo Node.js is required. Install Node.js 22 or later.
    pause
    exit /b 1
)

if not exist "node_modules\express\package.json" (
    echo Dependencies are missing. Run npm ci from this folder once.
    pause
    exit /b 1
)

set "MACHAW_URL="
for /f "delims=" %%U in ('node --env-file-if-exists=.env -e "const p=Number(process.env.PORT||3000);if(Number.isInteger(p) && p>=1 && p<=65535)console.log('http://127.0.0.1:'+p)" 2^>nul') do set "MACHAW_URL=%%U"
if not defined MACHAW_URL (
    echo Could not read the dashboard URL. Check the .env file.
    pause
    exit /b 1
)

powershell -NoProfile -Command "try { $r = Invoke-RestMethod ($env:MACHAW_URL + '/api/state') -TimeoutSec 1; if ($r.mode -in 'live','demo' -and $null -ne $r.requests) { exit 0 } } catch {}; exit 1"
if not errorlevel 1 (
    start "" "%MACHAW_URL%"
    exit /b 0
)

start "MACHAW Manager Server" cmd /k npm run start
powershell -NoProfile -Command "for ($i = 0; $i -lt 30; $i++) { try { $r = Invoke-RestMethod ($env:MACHAW_URL + '/api/state') -TimeoutSec 1; if ($r.mode -in 'live','demo' -and $null -ne $r.requests) { Start-Process $env:MACHAW_URL; exit 0 } } catch {}; Start-Sleep -Milliseconds 500 }; exit 1"
if errorlevel 1 (
    echo Dashboard did not start. Check the MACHAW Manager Server window.
    pause
    exit /b 1
)
