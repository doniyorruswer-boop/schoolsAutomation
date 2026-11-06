# O'qituvchi AI Yordamchisi (EduMaktab AI)

O'zbekiston maktab o'qituvchilari uchun darsga tayyorgarlik, BSB/CHSB tuzish, tahlil bayonnomalarini avtomatlashtirish va e-Maktab ma'lumotlarini qayta ishlash platformasi.

---

## 1. Asosiy maqsad va falsafa

- **Davlat platformalari (e-Maktab, ERP) bilan raqobatlashmaydi:** Jurnal, davomat va rasmiy jadvallarni qayta yaratmaymiz. O'qituvchining tashqaridagi qog'ozbozligi va qora mehnatini yengillatamiz.
- **Nazorat formulasi:** `AI taklif qiladi → Dastur (Python) tekshiradi → O'qituvchi tasdiqlaydi`.
- **Shaxsiy ma'lumotlar xavfsizligi:** O'quvchilarning F.I.SH va baholari doimiy bazada saqlanmaydi. e-Maktab Excel fayli yuklanadi, hisob-kitoblar qilinadi, Word/PDF hisobot berilgach, vaqtinchalik ma'lumotlar xotiradan tozalanadi.

---

## 2. Asosiy 4 ta Modul

| # | Modul | Vazifasi |
|---|---|---|
| 1 | **BSB / CHSB Generatori** | Fan, sinf va mavzu tanlanganda davlat andozasidagi variantlar, baholash mezonlari va deskriptorlarni generatsiya qiladi. |
| 2 | **Tahlil Bayonnomasi** | e-Maktabdan yuklangan Excel fayldan o'zlashtirish %, sifat ko'rsatkichi va tahlil matnini hisoblab, rasmiy Word (docx) chiqaradi. |
| 3 | **Dars Konspekti va KTP** | 45 daqiqalik bosqichlarga bo'lingan rasmiy dars ishlanmasi va taqvim-mavzu reja konstruktori. |
| 4 | **Savollar Banki** | O'qituvchi tomonidan tasdiqlangan, sifatli savollar va topshiriqlarni qayta ishlatish uchun saqlaydi. |

---

## 3. Litsenziyalash va Tijoratlashtirish (Biznes modeli)

- Dastur har bir o'qituvchiga **Faollashtirish kodi (Activation Key)** orqali sotiladi (masalan: `EDU-8F2A-99B1-2026`).
- Yangi foydalanuvchiga **1 marta bepul sinov** imkoniyati beriladi.
- Kod kiritilganda foydalanuvchi akkauntiga bog'lanadi (one-time binding) va amal qilish muddati (30 kun, 90 kun, 1 yil) belgilanadi.
- Muddat tugagach dastur yangi kod kiritilmaguncha qulflanadi.

---

## 4. Texnologiyalar steki

- **Backend:** Python (FastAPI) + SQLAlchemy + SQLite (keyinchalik PostgreSQL ga o'tish tayyor)
- **Hujjatlar generatori:** `python-docx` (Word), `openpyxl` (Excel)
- **AI Dvigateli:** Google Gemini API (strukturalangan JSON rejimida)
- **Frontend:** React / Next.js (Tailwind CSS) — PWA rejimida (mobil va kompyuterga 100% mos)
- **Autentifikatsiya:** Telegram Auth / Parolsiz kirish tizimi

---

## 5. Loyiha papkalar tuzilishi

```
schoolsAuto/
├── README.md
├── backend/
│   ├── app/
│   │   ├── core/           # Konfiguratsiya, Baza ulanishi, Xavfsizlik, Litsenziya nazorati
│   │   ├── models/         # Baza modellari (User, LicenseKey, Subject, Topic, Assessment, etc.)
│   │   ├── schemas/        # Pydantic schemalar
│   │   ├── services/       # AI, Validator, Word va Excel generatorlari
│   │   ├── api/v1/         # REST API endpointlari (auth, license, bsb, tahlil, curriculum)
│   │   ├── data/seed_data/ # Boshlang'ich rasmiy o'quv dasturi mavzulari (Algebra, Ona tili)
│   │   └── main.py         # FastAPI ilovasi
│   ├── requirements.txt
│   └── .env.example
├── frontend/               # PWA Veb ilova (Mobil + Desktop)
└── docs/                   # Texnik hujjatlar va namuna shablonlar
```
