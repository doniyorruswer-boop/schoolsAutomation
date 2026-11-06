@echo off
chcp 65001 >nul
title EduMaktab AI - Ishga Tushirish

echo ==========================================================
echo       O'qituvchi AI Yordamchisi (EduMaktab AI)           
echo ==========================================================
echo.

set SCRIPT_DIR=%~dp0

:: 1. Python borligini tekshirish
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [XATOLIK] Python kompyuteringizda topilmadi!
    echo Iltimos, https://www.python.org saytidan Python 3.10 yoki undan yuqori versiyani o'rnating.
    echo O'rnatishda "Add Python to PATH" katagiga belgi qo'yishni unutmang!
    echo.
    pause
    exit /b 1
)

:: 2. Node.js borligini tekshirish
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [XATOLIK] Node.js kompyuteringizda topilmadi!
    echo Iltimos, https://nodejs.org saytidan Node.js 18 yoki undan yuqori versiyani o'rnating.
    echo.
    pause
    exit /b 1
)

:: 3. Muhit (.env) fayllarini tekshirish
echo [1/3] Muhit sozlamalari tayyorlanmoqda...
if not exist "%SCRIPT_DIR%backend\.env" (
    if exist "%SCRIPT_DIR%backend\.env.example" (
        echo backend\.env fayli yaratilmoqda...
        copy "%SCRIPT_DIR%backend\.env.example" "%SCRIPT_DIR%backend\.env" >nul
    )
)

if not exist "%SCRIPT_DIR%frontend\.env" (
    if exist "%SCRIPT_DIR%frontend\.env.example" (
        echo frontend\.env fayli yaratilmoqda...
        copy "%SCRIPT_DIR%frontend\.env.example" "%SCRIPT_DIR%frontend\.env" >nul
    )
)

:: 4. Backend sozlamalari va virtualenv
echo.
echo [2/3] Backend (FastAPI) tayyorlanmoqda...
cd /d "%SCRIPT_DIR%backend"

if not exist "venv\Scripts\activate.bat" (
    echo Virtual muhit (venv) yaratilmoqda...
    python -m venv venv
    call venv\Scripts\activate.bat
    echo Python kutubxonalari o'rnatilmoqda (requirements.txt)...
    pip install -r requirements.txt
) else (
    call venv\Scripts\activate.bat
)

:: Bazani tekshirish va dastlabki ma'lumotlarni yuklash
echo Baza va DTS standartlari tekshirilmoqda...
python -m app.core.init_db

:: 5. Frontend kutubxonalari
echo.
echo [3/3] Frontend (React PWA) tayyorlanmoqda...
cd /d "%SCRIPT_DIR%frontend"

if not exist "node_modules" (
    echo Frontend kutubxonalari o'rnatilmoqda (npm install)...
    call npm install
)

:: 6. Ikkala serverni ishga tushirish
echo.
echo ==========================================================
echo Barcha tizimlar tayyor! Serverlar ishga tushirilmoqda...
echo ==========================================================
echo.

cd /d "%SCRIPT_DIR%backend"
start "EduMaktab - Backend API (Port 8000)" cmd /k "call venv\Scripts\activate.bat && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

cd /d "%SCRIPT_DIR%frontend"
start "EduMaktab - Frontend (Port 3000)" cmd /k "npm run dev -- --host --port 3000"

echo ----------------------------------------------------------
echo Tizim muvaffaqiyatli ishga tushdi!
echo.
echo • Brauzerda ochish manzili:        http://localhost:3000
echo • Backend API hujjatlari (Swagger): http://localhost:8000/docs
echo • Dastlabki sinov PRO kodi:        EDU-TEST-2026-PRO1
echo ----------------------------------------------------------
echo Dasturni to'xtatish uchun ochilgan qora konsol oynalarini yopishingiz mumkin.
echo.
pause
