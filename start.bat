@echo off
chcp 65001 >nul
title ADB 무선 디버깅 매니저 (ADB Wireless Manager)
color 0B

echo ====================================================
echo   ADB Wireless Debugging Manager (Windows)
echo ====================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js가 설치되어 있지 않습니다.
    echo https://nodejs.org 에서 Node.js를 먼저 설치해주세요.
    echo.
    pause
    exit /b 1
)

where adb >nul 2>nul
if %errorlevel% neq 0 (
    echo [INFO] PATH에 adb가 없습니다. Android SDK 경로를 확인합니다...
    if exist "%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" (
        echo [INFO] Android SDK adb를 발견했습니다: %LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe
        set "PATH=%LOCALAPPDATA%\Android\Sdk\platform-tools;%PATH%"
    ) else (
        echo [WARNING] adb를 찾을 수 없습니다. Android Studio 또는 Platform Tools를 설치해주세요.
    )
)

echo.
echo [1/2] 서버를 실행하는 중입니다... (http://localhost:4567)
start "" "http://localhost:4567"
node server.js

pause
