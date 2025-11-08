@echo off
title 🚀 Popflare 4.0 — Automatic Netlify Deployment
color 0A

echo =======================================================
echo   POPFLARE 4.0 — One-Click Build & Netlify Deployment
echo =======================================================
echo.

:: Step 1 — Move to project directory
cd /d "%~dp0"

:: Step 2 — Check for Node.js
node -v >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo ❌ Node.js is not installed. Please install it from https://nodejs.org/
    pause
    exit /b 1
)

:: Step 3 — Install dependencies
echo 🧩 Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    color 0C
    echo ❌ npm install failed — please check your internet connection or package.json.
    pause
    exit /b 1
)
echo ✅ Dependencies installed successfully.
echo.

:: Step 4 — Build content feeds
echo 🎬 Building YouTube and content feeds...
call npm run build:feeds
if %errorlevel% neq 0 (
    color 0C
    echo ❌ Feed build failed. Please check scripts/build_feeds.mjs.
    pause
    exit /b 1
)
echo ✅ Feeds built successfully.
echo.

:: Step 5 — Deploy via Netlify (manual open in Chrome)
echo 🌍 Opening Netlify dashboard...
echo -------------------------------------------------------
echo When Netlify opens, click:
echo   → "Add new site" → "Import an existing project"
echo   → Connect "Local Folder"
echo   → Choose: C:\Popflare\public
echo -------------------------------------------------------

:: --- Force Chrome instead of Edge ---
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" "https://app.netlify.com/"
) else (
    if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
        start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" "https://app.netlify.com/"
    ) else (
        echo ⚠️ Chrome not found — opening in default browser instead.
        start https://app.netlify.com/
    )
)
echo.

echo ✅ Deployment ready.
echo -------------------------------------------------------
echo All feeds updated. Netlify is open for publishing.
echo -------------------------------------------------------
pause
