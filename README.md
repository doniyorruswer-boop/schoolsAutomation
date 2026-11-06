# O'qituvchi AI Yordamchisi (EduMaktab AI)

O'zbekiston maktab o'qituvchilari uchun darsga tayyorgarlik, BSB/CHSB tuzish, tahlil bayonnomalarini avtomatlashtirish, KTP (Taqvim-mavzu reja) va dars konspektlarini shakllantirish platformasi.

---

## ⚡ Tezkor Ishga Tushirish (Quick Start)

Batafsil ko'rsatmalar uchun: **[SETUP.md](SETUP.md)** fayliga qarang.

### 1-usul: Docker orqali (100% barcha kompyuterlarda bir xil ishlaydi)
```bash
docker compose up --build
```

### 2-usul: Bitta bosish orqali
- **Windows da:** `run.bat` faylini 2 marta bosing.
- **Linux / macOS da:**
  ```bash
  chmod +x run.sh
  ./run.sh
  ```

### 3-usul: Qo'lda (Manual)
```bash
# 1. Backend
cd backend
cp .env.example .env
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m app.core.init_db
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 2. Frontend (alohida terminalda)
cd frontend
cp .env.example .env
npm install
npm run dev -- --host --port 3000
```

- **Veb ilova manzili:** [http://localhost:3000](http://localhost:3000)
- **API Hujjatlari (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Sinov uchun PRO litsenziya kaliti:** `EDU-TEST-2026-PRO1`

---

## 1. Asosiy maqsad va falsafa

- **Davlat platformalari (e-Maktab, ERP) bilan raqobatlashmaydi:** Jurnal, davomat va rasmiy jadvallarni qayta yaratmaymiz. O'qituvchining tashqaridagi qog'ozbozligi va qora mehnatini yengillatamiz.
- **Nazorat formulasi:** `AI taklif qiladi → Dastur (Python) tekshiradi → O'qituvchi tasdiqlaydi`.
- **Shaxsiy ma'lumotlar xavfsizligi:** O'quvchilarning F.I.SH va baholari doimiy bazada saqlanmaydi. e-Maktab Excel fayli yuklanadi, hisob-kitoblar qilinadi, Word/PDF hisobot berilgach, vaqtinchalik ma'lumotlar xotiradan tozalanadi.
- **100% Bepul / Ofline ishlash kafolati:** Agar Gemini API kaliti kiritilmasa ham tizim avtomatik rasmiy DTS protsedural generatori orqali to'liq ishlaydi.

---

## 2. Asosiy Modullar

| # | Modul | Vazifasi |
|---|---|---|
| 1 | **BSB / CHSB Generatori** | Fan, sinf, mavzu va darslik betlari tanlanganda davlat andozasidagi variantlar, baholash mezonlari va deskriptorlarni generatsiya qiladi. O'qituvchi istalgan savolni yangisiga almashtira oladi (`🔄 Savolni almashtirish`). |
| 2 | **Tahlil Bayonnomasi** | e-Maktabdan yuklangan Excel baholar jurnalidan o'zlashtirish %, sifat ko'rsatkichi va tahlil matnini hisoblab, rasmiy Word (docx) chiqaradi. |
| 3 | **Dars Taqdimoti (PowerPoint)** | Gamma uslubida dars mavzusi bo'yicha tahrirlanadigan, zamonaviy dizaynli `.pptx` slaydlar yaratadi. |
| 4 | **Taqvim-Mavzu Reja (KTP) va Konspekt** | 5-11 sinflar uchun rasmiy DTS standartidagi 68/102 soatlik KTP reja va 45 daqiqalik dars konspektlarini tuzadi, rasmiy Word (.docx) chiqaradi. Shuningdek, o'qituvchining shaxsiy KTP faylini yuklab tizimni unga qulflash imkoniyati mavjud. |

---

## 3. Litsenziyalash va Tijoratlashtirish (Biznes modeli)

- Dastur har bir o'qituvchiga **Faollashtirish kodi (Activation Key)** orqali sotiladi (masalan: `EDU-8F2A-99B1-2026`).
- Yangi foydalanuvchiga **1 marta bepul sinov** imkoniyati beriladi.
- Sinov PRO kodi: `EDU-TEST-2026-PRO1` (30 kunlik) va `EDU-MAKTAB-7777-YEAR` (365 kunlik).
- Kod kiritilganda foydalanuvchi akkauntiga bog'lanadi (one-time binding) va amal qilish muddati belgilanadi.

---

## 4. Texnologiyalar steki

- **Backend:** Python (FastAPI) + SQLAlchemy + SQLite (PostgreSQL ga o'tishga 100% tayyor)
- **Hujjatlar generatori:** `python-docx` (Word), `openpyxl` (Excel), `python-pptx` (PowerPoint)
- **AI Dvigateli:** Google Gemini API (strukturalangan JSON rejimida) + Protsedural andozalar
- **Frontend:** React + Tailwind CSS (Vite) — PWA rejimida (mobil va kompyuterga 100% mos)
- **Konteynerizatsiya:** Docker & Docker Compose
- **Autentifikatsiya:** Telegram Auth / Parolsiz kirish tizimi

---

## 5. Loyiha papkalar tuzilishi

```
schoolsAuto/
├── README.md               # Asosiy ma'lumot
├── SETUP.md                # Istalgan kompyuterda ishga tushirish qo'llanmasi
├── docker-compose.yml      # Docker orkestratsiyasi
├── run.sh                  # Linux / Mac uchun bitta bosishda ishga tushiruvchi
├── run.bat                 # Windows uchun bitta bosishda ishga tushiruvchi
├── .env.example            # Tizim umumiy sozlamalari shabloni
├── backend/
│   ├── Dockerfile          # Backend Docker konfiguratsiyasi
│   ├── requirements.txt    # Python kutubxonalari
│   ├── .env.example        # Backend sozlamalari
│   ├── schools_auto.db     # SQLite ma'lumotlar bazasi (DTS standartlari yuklangan)
│   ├── tests/              # Pytest avtotestlari (13 ta to'liq test)
│   └── app/
│       ├── core/           # Konfiguratsiya, Baza ulanishi, Xavfsizlik, Litsenziya
│       ├── models/         # Baza modellari (User, LicenseKey, Subject, Topic, Assessment)
│       ├── schemas/        # Pydantic schemalar
│       ├── services/       # AI, Validator, Word, Excel, PowerPoint, OCR xizmatlari
│       ├── api/v1/         # REST API endpointlari (auth, license, bsb, tahlil, ktp, presentation)
│       └── data/seed_data/ # Boshlang'ich rasmiy DTS o'quv dasturi mavzulari (5-11 sinflar)
└── frontend/
    ├── Dockerfile          # Frontend Docker konfiguratsiyasi
    ├── package.json        # Node.js paketlari
    ├── .env.example        # Frontend sozlamalari
    ├── vite.config.js      # Vite konfiguratsiyasi va proksi
    └── src/                # React komponentlari va PWA interfeysi
```
