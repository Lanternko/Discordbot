@echo off
echo ====================================
echo   Discord Stats Bot 啟動程序
echo ====================================
echo.

REM 檢查 Node.js 是否安裝
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 錯誤：找不到 Node.js
    echo 請安裝 Node.js 18 或更新版本
    echo 下載網址: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ 檢測到 Node.js
node --version

REM 檢查是否已安裝依賴
if not exist "node_modules" (
    echo.
    echo 📦 首次啟動，正在安裝依賴套件...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ 依賴安裝失敗
        pause
        exit /b 1
    )
    echo ✅ 依賴安裝完成
)

REM 檢查 .env 檔案
if not exist ".env" (
    echo.
    echo ⚠️  警告：找不到 .env 檔案
    echo 請複製 .env.example 為 .env 並設定您的機器人資訊
    echo.
    echo 按任意鍵開啟設定說明...
    pause >nul
    start SETUP.md
    exit /b 1
)

REM 檢查資料庫資料夾
if not exist "database" (
    echo.
    echo 📁 建立資料庫資料夾...
    mkdir database
)

REM 詢問啟動模式
echo.
echo 🚀 選擇啟動模式:
echo [1] 開發模式 (自動重啟)
echo [2] 正式模式
echo [3] 部署指令並啟動
echo [4] 僅部署指令
echo.
set /p choice="請選擇 (1-4): "

if "%choice%"=="1" (
    echo.
    echo 🔄 啟動開發模式...
    call npm run dev
) else if "%choice%"=="2" (
    echo.
    echo 🚀 啟動正式模式...
    call npm start
) else if "%choice%"=="3" (
    echo.
    echo 📤 部署指令...
    call npm run deploy:commands
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo ✅ 指令部署成功，啟動機器人...
        call npm start
    )
) else if "%choice%"=="4" (
    echo.
    echo 📤 僅部署指令...
    call npm run deploy:commands
) else (
    echo ❌ 無效選擇
    pause
    exit /b 1
)

echo.
echo 程式已結束，按任意鍵關閉...
pause >nul