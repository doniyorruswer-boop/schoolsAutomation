#!/usr/bin/env bash

# ==============================================================
# EduMaktab AI - Tezkor Ishga Tushirish Skripti (Linux / macOS)
# ==============================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================================="
echo "      O'qituvchi AI Yordamchisi (EduMaktab AI)           "
echo "=========================================================="

# 1. Muhit fayllarini tekshirish (.env)
if [ ! -f "$SCRIPT_DIR/backend/.env" ] && [ -f "$SCRIPT_DIR/backend/.env.example" ]; then
    echo "[1/4] backend/.env fayli yaratilmoqda..."
    cp "$SCRIPT_DIR/backend/.env.example" "$SCRIPT_DIR/backend/.env"
fi

if [ ! -f "$SCRIPT_DIR/frontend/.env" ] && [ -f "$SCRIPT_DIR/frontend/.env.example" ]; then
    echo "[1/4] frontend/.env fayli yaratilmoqda..."
    cp "$SCRIPT_DIR/frontend/.env.example" "$SCRIPT_DIR/frontend/.env"
fi

# 2. Backend virtual muhit va kutubxonalar
echo "[2/4] Backend (FastAPI) tayyorlanmoqda..."
cd "$SCRIPT_DIR/backend"
if [ ! -d "venv" ]; then
    echo "Virtualenv yaratilmoqda..."
    python3 -m venv venv || python3 -m virtualenv venv
    ./venv/bin/pip install --upgrade pip
    ./venv/bin/pip install -r requirements.txt
fi

# Ma'lumotlar bazasi va DTS standartlarini tekshirish
echo "[3/4] Baza va DTS standartlari tekshirilmoqda..."
PYTHONPATH=. ./venv/bin/python -m app.core.init_db

# Uvicorn serverini fonda ishga tushirish
PYTHONPATH=. ./venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
echo "Backend port 8000 da ishga tushdi (PID: $BACKEND_PID)"

# 3. Frontend kutubxonalari va server
echo "[4/4] Frontend (React PWA) tayyorlanmoqda..."
cd "$SCRIPT_DIR/frontend"
if [ ! -d "node_modules" ]; then
    echo "Frontend kutubxonalari o'rnatilmoqda (npm install)..."
    npm install
fi

npm run dev -- --host --port 3000 &
FRONTEND_PID=$!
echo "Frontend port 3000 da ishga tushdi (PID: $FRONTEND_PID)"

echo ""
echo "----------------------------------------------------------"
echo "Tizim muvaffaqiyatli ishga tushdi!"
echo "• Web Ilova (Telefon va Kompyuter uchun): http://localhost:3000"
echo "• Backend Swagger API Hujjatlari:       http://localhost:8000/docs"
echo "• Sinov uchun faol PRO litsenziya kodi: EDU-TEST-2026-PRO1"
echo "----------------------------------------------------------"
echo "To'xtatish uchun: Ctrl + C tugmasini bosing."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true; exit 0" SIGINT SIGTERM
wait
