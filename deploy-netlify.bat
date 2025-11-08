@echo off
title 🚀 Popflare Auto-Deploy for Netlify
echo =======================================================
echo   POPFLARE 4.0 — One-Click Build & Netlify Deployment
echo =======================================================
echo.

:: Step 1 — Go to project root
cd /d "%~dp0"

:: Step 2 — Install dependencies
echo 🧩 Installing or updating dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ NPM install failed. Check your internet connection or package.json.
    pause
    exit /b 1
)
echo ✅ Dependencies installed successfully.
echo.

:: Step 3 — Build official YouTube feeds
echo 🎬 Building YouTube video feeds (football, trailers, charts, viral)...
call npm run build:feeds
if %errorlevel% neq 0 (
    echo ❌ Feed build failed. Check your scripts or content sources.
    pause
    exit /b 1
)
echo ✅ Feeds built successfully.
echo.

:: Step 4 — Open Netlify dashboard
echo 🌍 Opening Netlify dashboard...
start https://app.netlify.com/

echo.
echo ✅ All done! 
echo Your feeds are built and Netlify is ready for deployment.
echo -------------------------------------------------------
echo When Netlify opens, click:
echo   → "Add New Site" → "Import an existing project"
echo   → Connect "Local Folder"
echo   → Choose: C:\Popflare\public
echo -------------------------------------------------------
pause
