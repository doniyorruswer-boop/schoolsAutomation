#!/usr/bin/env bash

# O'qituvchi AI Yordamchisi - Tezkor Ishga Tushirish Skripti
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================================="
echo "      O'qituvchi AI Yordamchisi (EduMaktab AI)           "
echo "=========================================================="

# 1. Backendni ishga tushirish
echo "[1/2] Backend (FastAPI) ishga tushirilmoqda..."
cd "$SCRIPT_DIR/backend"
if [ ! -d "venv" ]; then
    echo "Virtualenv topilmadi! O'rnatilmoqda..."
    python3 -m virtualenv venv
    ./venv/bin/pip install -r requirements.txt
fi

# Ma'lumotlar bazasi va mavzularni tekshirish
PYTHONPATH=. ./venv/bin/python -m app.core.init_db

# Uvicorn serverini fonda ishga tushirish
PYTHONPATH=. ./venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
echo "Backend port 8000 da ishga tushdi (PID: $BACKEND_PID)"

# 2. Frontendni ishga tushirish
echo "[2/2] Frontend (PWA Web) ishga tushirilmoqda..."
cd "$SCRIPT_DIR/frontend"
npm run dev -- --host &
FRONTEND_PID=$!

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
