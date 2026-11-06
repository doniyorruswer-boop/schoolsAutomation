# ==============================================================
# EduMaktab AI - Backend Dockerfile (FastAPI + Python 3.12)
# ==============================================================
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

WORKDIR /app

# docx, ocr va grafik kutubxonalari uchun tizim paketlari
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Talab qilinadigan kutubxonalarni o'rnatish
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Backend kodlarini nusxalash
COPY . .

# FastAPI porti
EXPOSE 8000

# Baza va DTS standartlarini tekshirib, serverni ishga tushirish
CMD ["sh", "-c", "python -m app.core.init_db && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
