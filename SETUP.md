# 🚀 EduMaktab AI - Istalgan Kompyuterda O'rnatish va Ishga Tushirish Qo'llanmasi

Ushbu qo'llanma orqali siz **EduMaktab AI** platformasini istalgan yangi kompyuterda (Windows, Linux, macOS) yoki serverda 100% bir xil va xatosiz ishga tushirishingiz mumkin.

---

## 📋 Tizim Talablari

Quyidagi usullardan birini tanlang:

| Usul | Talab qilinadigan dasturlar | Murakkabligi | Tavsiya |
|---|---|---|---|
| **1-Usul: Docker** | Faqat Docker Desktop | 🟢 Juda oson | ⭐ Eng tavsiya etilgan (100% bir xil muhit) |
| **2-Usul: Skript orqali** | Python 3.10+, Node.js 18+ | 🟢 Juda oson | ⭐ Tezkor dasturlash uchun |
| **3-Usul: Qo'lda (Manual)** | Python 3.10+, Node.js 18+ | 🟡 O'rta | Moslashtirish va serverga qo'yish uchun |

---

## 🐳 1-Usul: Docker orqali ishga tushirish (Eng oson va kafolatli)

Hech qanday Python yoki Node.js o'rnatish shart emas. Tizim to'liq izolyatsiyalangan konteynerlarda ishga tushadi:

1. Repozitoriyni yuklab oling yoki klon qiling:
   ```bash
   git clone https://github.com/doniyorruswer-boop/schoolsAutomation.git
   cd schoolsAutomation
   ```

2. Tizimni bitta buyruq bilan ishga tushiring:
   ```bash
   docker compose up --build
   ```

3. Brauzerda oching:
   - **Ilova interfeysi:** [http://localhost:3000](http://localhost:3000)
   - **Backend API (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)

*To'xtatish uchun terminalda `Ctrl + C` bosing.*

---

## ⚡ 2-Usul: Avtomatik Skriptlar orqali (Bitta bosishda)

Repozitoriyni klon qiling:
```bash
git clone https://github.com/doniyorruswer-boop/schoolsAutomation.git
cd schoolsAutomation
```

### 🪟 Windows foydalanuvchilari uchun:
1. Kompyuteringizda **Python 3.10+** (o'rnatishda "Add Python to PATH" belgilansin) va **Node.js 18+** o'rnatilganligiga ishonch hosil qiling.
2. Loyiha papkasidagi **`run.bat`** fayliga sichqoncha bilan 2 marta bosing.
3. Skript avtomatik ravishda:
   - `.env` fayllarini yaratadi;
   - Virtual muhit (venv) ochib, kutubxonalarni o'rnatadi;
   - DTS o'quv dasturi bazasini tekshiradi;
   - Frontend paketlarini o'rnatadi;
   - Ikkala serverni ishga tushiradi va brauzerda ochishga tayyorlaydi.

### 🐧 Linux va 🍏 macOS foydalanuvchilari uchun:
Terminalda quyidagi buyruqni bering:
```bash
chmod +x run.sh
./run.sh
```

---

## 🛠 3-Usul: Qo'lda (Manual) Bosqichma-bosqich O'rnatish

### 1-qadam: Backendni tayyorlash
```bash
cd backend

# Muhit faylini nusxalash
cp .env.example .env

# Virtual muhit yaratish va faollashtirish
python3 -m venv venv
source venv/bin/activate       # Linux/Mac
# venv\Scripts\activate        # Windows da

# Kutubxonalarni o'rnatish
pip install -r requirements.txt

# Baza va Davlat ta'lim standartlari (DTS) mavzularini bazaga kiritish
python -m app.core.init_db

# Backend serverni ishga tushirish (Port 8000)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2-qadam: Frontendni tayyorlash (Yangi terminalda)
```bash
cd frontend

# Muhit faylini nusxalash
cp .env.example .env

# Kutubxonalarni o'rnatish
npm install

# Frontend serverni ishga tushirish (Port 3000)
npm run dev -- --host --port 3000
```

---

## 🔑 Dasturga Kirish va Litsenziya Kodlari

Brauzeringizda **http://localhost:3000** manziliga kiring:

1. **Kirish:**
   - Dasturga kirish uchun login va parol talab qilinmaydi.
   - O'qituvchi o'z ismi, maktabi va fanini kiritib **Telegram orqali 1 marta bosishda** kirishi mumkin.

2. **Sinov uchun tayyor PRO Litsenziya kaliti:**
   - Kod: **`EDU-TEST-2026-PRO1`** (30 kunlik to'liq PRO)
   - Yillik to'liq kod: **`EDU-MAKTAB-7777-YEAR`** (365 kunlik PRO)
   - Yuqori o'ng burchakdagi litsenziya belgisini bosib, ushbu kodni kiritsangiz barcha PRO funksiyalar cheklovsiz ochiladi.

---

## ⚙️ Muhit Sozlamalari (.env) Tushuntirishi

| O'zgaruvchi | Standart qiymat | Tavsifi |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./schools_auto.db` | Ma'lumotlar bazasi. Avtomatik ravishda `backend/schools_auto.db` ga ulanadi. |
| `SECRET_KEY` | `edumaktab-super-secret-key...` | JWT tokenlarni imzolash uchun xavfsizlik kaliti. |
| `GEMINI_API_KEY` | *bo'sh* | Google Gemini API kaliti (**ixtiyoriy**). Agar kiritilmasa ham tizim 100% to'liq va bepul protsedural andozalar orqali ishlayveradi. |
| `GEMINI_MODEL` | `gemini-2.5-flash` | AI modeli nomi. |
| `VITE_BACKEND_URL` | `http://localhost:8000` | Frontend backend bilan aloqa qiladigan manzil. |
| `PORT` | `3000` | Frontend porti. |

---

## 🧪 Avtomatlashtirilgan Testlarni Tekshirish

Barcha modullar, BSB generatori, formula tekshiruvi, KTP va Word eksporti 100% to'g'ri ishlayotganligini tekshirish uchun:
```bash
cd backend
source venv/bin/activate
pytest tests/
```
*(Barcha 13 ta test yashil holatda muvaffaqiyatli o'tadi).*
