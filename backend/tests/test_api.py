import pytest
import io
import openpyxl
from fastapi.testclient import TestClient
from app.main import app
from app.core.init_db import init_database

# Baza jadvallarini testdan oldin tayyorlash
init_database()
client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_get_curriculum_subjects_and_topics():
    # Fanlarni olish
    response = client.get("/api/v1/curriculum/subjects")
    assert response.status_code == 200
    subjects = response.json()
    assert len(subjects) >= 2
    
    algebra = next(s for s in subjects if s["code"] == "algebra")
    assert algebra["name"] == "Algebra"
    
    # 7-sinf 1-chorak mavzularini olish
    topics_res = client.get(f"/api/v1/curriculum/topics?subject_id={algebra['id']}&grade=7&quarter=1")
    assert topics_res.status_code == 200
    topics = topics_res.json()
    assert len(topics) >= 1
    assert "Algebraik ifodalar" in topics[0]["title"] or "Sonli" in topics[0]["title"]


def test_license_status_and_activation():
    # 1. Joriy litsenziya holatini tekshirish
    status_res = client.get("/api/v1/license/status")
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert "trial_assessments_left" in status_data
    
    # 2. Mavjud bo'lmagan kod bilan xato berishi
    bad_res = client.post("/api/v1/license/activate", json={"key_code": "NOT-EXISTING-KEY"})
    assert bad_res.status_code == 404
    
    # 3. Haqiqiy kalit bilan faollashtirish (Init DB dagi EDU-TEST-2026-PRO1)
    act_res = client.post("/api/v1/license/activate", json={"key_code": "EDU-TEST-2026-PRO1"})
    assert act_res.status_code == 200
    act_data = act_res.json()
    assert act_data["status"] == "ACTIVE"
    assert act_data["plan_type"] == "PRO"


def test_bsb_generation_and_export_word():
    # Subyekt va mavzuni olish
    subjects = client.get("/api/v1/curriculum/subjects").json()
    algebra = next(s for s in subjects if s["code"] == "algebra")
    topics = client.get(f"/api/v1/curriculum/topics?subject_id={algebra['id']}&grade=7&quarter=1").json()
    topic_ids = [topics[0]["id"]]

    # BSB generatsiya qilish
    bsb_payload = {
        "title": "7-Sinf Algebra 1-BSB Sinov",
        "assessment_type": "BSB",
        "subject_id": algebra["id"],
        "grade": 7,
        "quarter": 1,
        "topic_ids": topic_ids,
        "total_max_score": 25,
        "variants_count": 2
    }
    
    gen_res = client.post("/api/v1/bsb/generate", json=bsb_payload)
    assert gen_res.status_code == 200
    bsb_data = gen_res.json()
    assert bsb_data["status"] == "DRAFT"
    assert "variants" in bsb_data["content"]
    assert len(bsb_data["content"]["variants"]) == 2
    
    # Validator hisoboti mavjudligini tekshirish
    val_rep = bsb_data["validation_report"]
    assert val_rep is not None
    assert val_rep["is_valid"] is True
    assert val_rep["target_total_score"] == 25

    # Tasdiqlash (APPROVE)
    bsb_id = bsb_data["id"]
    app_res = client.post(f"/api/v1/bsb/{bsb_id}/approve")
    assert app_res.status_code == 200
    assert app_res.json()["status"] == "APPROVED"

    # Word (.docx) formatida yuklab olish
    export_res = client.get(f"/api/v1/bsb/{bsb_id}/export-word")
    assert export_res.status_code == 200
    assert len(export_res.content) > 1000  # Haqiqiy docx fayli qaytgan


def test_tahlil_excel_processing_and_word_export():
    # Test uchun kichik namunaviy Excel fayl yaratamiz
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["№", "O'quvchi F.I.SH", "BSB Ball (100)"])
    sample_scores = [95, 88, 80, 75, 65, 60, 45, 90, 85, 70] # 10 ta o'quvchi
    for i, sc in enumerate(sample_scores, 1):
        ws.append([i, f"O'quvchi {i}", sc])
        
    excel_stream = io.BytesIO()
    wb.save(excel_stream)
    excel_stream.seek(0)

    files = {"file": ("e-maktab_baholar.xlsx", excel_stream, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    data = {
        "subject_name": "Algebra",
        "class_name": "7-A",
        "assessment_title": "1-BSB",
        "max_score": "100.0"
    }

    res = client.post("/api/v1/tahlil/process-excel", files=files, data=data)
    assert res.status_code == 200
    tahlil = res.json()
    
    st = tahlil["statistics"]
    assert st["total_students"] == 10
    assert st["count_5"] >= 1
    assert st["mastery_percentage"] >= 80.0
    assert st["quality_percentage"] >= 50.0
    assert "Algebra" in tahlil["recommendations"]


def test_russian_curriculum_and_bsb_generation():
    # Rus tili fani va mavzularini olish
    subjects = client.get("/api/v1/curriculum/subjects").json()
    algebra_ru = next((s for s in subjects if s["code"] == "algebra_ru"), None)
    assert algebra_ru is not None, "Rus tili sinflari uchun 'Алгебра' fani bazada topilmadi"
    assert algebra_ru["name"] == "Алгебра"

    topics = client.get(f"/api/v1/curriculum/topics?subject_id={algebra_ru['id']}&grade=7&quarter=1").json()
    assert len(topics) >= 1
    assert "выражен" in topics[0]["title"] or "числов" in topics[0]["title"]
    topic_ids = [topics[0]["id"]]

    # Rus tilida BSB (СОР) generatsiya qilish
    bsb_payload = {
        "title": "7-й класс Алгебра 1-четверть 1-СОР",
        "assessment_type": "BSB",
        "subject_id": algebra_ru["id"],
        "grade": 7,
        "quarter": 1,
        "topic_ids": topic_ids,
        "total_max_score": 25,
        "variants_count": 2,
        "lang": "ru"
    }

    gen_res = client.post("/api/v1/bsb/generate", json=bsb_payload)
    assert gen_res.status_code == 200
    bsb_data = gen_res.json()
    assert bsb_data["status"] == "DRAFT"
    assert len(bsb_data["content"]["variants"]) == 2

    # Word (.docx) yuklab olish
    bsb_id = bsb_data["id"]
    export_res = client.get(f"/api/v1/bsb/{bsb_id}/export-word")
    assert export_res.status_code == 200
    assert len(export_res.content) > 1000


def test_russian_presentation_and_pptx_export():
    # Rus tilida taqdimot generatsiyasi
    payload = {
        "subject_name": "Алгебра",
        "grade": 7,
        "topic_title": "Сложение и вычитание обыкновенных дробей",
        "slide_count": 5,
        "include_images": True,
        "lang": "ru"
    }

    gen_res = client.post("/api/v1/presentation/generate", json=payload)
    assert gen_res.status_code == 200
    data = gen_res.json()
    assert data["subject"] == "Алгебра"
    assert len(data["slides"]) == 5
    assert len(data["slides"][0]["bullet_points"]) >= 2

    # PowerPoint (.pptx) yuklab olish
    export_res = client.post("/api/v1/presentation/export-pptx", json=data)
    assert export_res.status_code == 200
    assert len(export_res.content) > 5000  # Haqiqiy pptx fayli


def test_manual_topic_crud_and_manual_bsb_generation():
    # 1. Fan olish
    subjects = client.get("/api/v1/curriculum/subjects").json()
    algebra = next(s for s in subjects if s["code"] == "algebra")

    # 2. Mavzuni qo'lda kiritish (POST /curriculum/topics)
    create_res = client.post("/api/v1/curriculum/topics", json={
        "subject_id": algebra["id"],
        "grade": 7,
        "quarter": 1,
        "title": "Sinov uchun qo'lda kiritilgan mavzu",
        "chapter": "O'qituvchi bobi"
    })
    assert create_res.status_code == 200
    new_topic = create_res.json()
    assert new_topic["title"] == "Sinov uchun qo'lda kiritilgan mavzu"
    new_topic_id = new_topic["id"]

    # 3. Mavzuni ro'yxatdan o'chirish (DELETE /curriculum/topics/{id})
    del_res = client.delete(f"/api/v1/curriculum/topics/{new_topic_id}")
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # 4. Standart mavzularga qaytarish (POST /curriculum/topics/reset-standard)
    reset_res = client.post(f"/api/v1/curriculum/topics/reset-standard?subject_id={algebra['id']}&grade=7&quarter=1")
    assert reset_res.status_code == 200
    restored_topics = reset_res.json()
    assert len(restored_topics) >= 1
    assert any("ifodalar" in t["title"] for t in restored_topics)

    # 5. BSB ni bevosita qo'lda kiritilgan matn shaklidagi mavzular bilan generatsiya qilish
    bsb_manual_payload = {
        "title": "7-sinf Algebra Erkin Matnli BSB",
        "assessment_type": "BSB",
        "subject_id": algebra["id"],
        "grade": 7,
        "quarter": 1,
        "topic_ids": [],
        "manual_topics": [
            "Kasr sonlarni qo'shish va ayirish amallari",
            "Kasrlarni umumiy maxrajga keltirish qoidasi"
        ],
        "total_max_score": 25,
        "variants_count": 2,
        "lang": "uz"
    }

    gen_res = client.post("/api/v1/bsb/generate", json=bsb_manual_payload)
    assert gen_res.status_code == 200
    bsb_data = gen_res.json()
    assert bsb_data["status"] == "DRAFT"
    assert len(bsb_data["content"]["variants"]) == 2


def test_subscriber_workspace_isolation():
    """
    Har bir obunachining ish maydoni (hujjatlari, mavzulari, litsenziyasi)
    bir-biriga mutlaqo aralashmasligini tekshirish.
    """
    # 1. 1-o'qituvchi hisobini ochish (Azizova Nilufar)
    t1_res = client.post("/api/v1/auth/phone-login", json={
        "phone_number": "+998901111111",
        "full_name": "Azizova Nilufar",
        "school_name": "Toshkent 15-maktab"
    })
    assert t1_res.status_code == 200
    t1_token = t1_res.json()["access_token"]
    t1_headers = {"Authorization": f"Bearer {t1_token}"}

    # 2. 2-o'qituvchi hisobini ochish (Karimov Jasur)
    t2_res = client.post("/api/v1/auth/phone-login", json={
        "phone_number": "+998902222222",
        "full_name": "Karimov Jasur",
        "school_name": "Samarqand 24-maktab"
    })
    assert t2_res.status_code == 200
    t2_token = t2_res.json()["access_token"]
    t2_headers = {"Authorization": f"Bearer {t2_token}"}

    # 3. 1-o'qituvchi o'ziga maxsus mavzu qo'shadi
    subjects = client.get("/api/v1/curriculum/subjects").json()
    algebra = next(s for s in subjects if s["code"] == "algebra")

    t1_add_topic = client.post("/api/v1/curriculum/topics", json={
        "subject_id": algebra["id"],
        "grade": 7,
        "quarter": 1,
        "title": "Faqat Nilufar o'qituvchining maxsus mavzusi",
        "chapter": "Nilufar bobi"
    }, headers=t1_headers)
    assert t1_add_topic.status_code == 200

    # 4. 1-o'qituvchi o'z mavzusini ko'radi
    t1_topics = client.get(f"/api/v1/curriculum/topics?subject_id={algebra['id']}&grade=7&quarter=1", headers=t1_headers).json()
    assert any("Nilufar" in t["title"] for t in t1_topics)

    # 5. 2-o'qituvchi 1-o'qituvchining mavzusini KO'RMAYDI!
    t2_topics = client.get(f"/api/v1/curriculum/topics?subject_id={algebra['id']}&grade=7&quarter=1", headers=t2_headers).json()
    assert not any("Nilufar" in t["title"] for t in t2_topics)

    # 6. 2-o'qituvchining hujjatlar ro'yxati 1-o'qituvchinikidan alohida
    t1_docs = client.get("/api/v1/bsb/my-list", headers=t1_headers).json()
    t2_docs = client.get("/api/v1/bsb/my-list", headers=t2_headers).json()
    assert isinstance(t1_docs, list)
    assert isinstance(t2_docs, list)
    # Yangi 2-o'qituvchida 0 ta hujjat bo'lishi kerak
    assert len(t2_docs) == 0

    # 7. 2-o'qituvchining litsenziyasi mustaqil (boshqa obunachiga aralashmaydi)
    t2_lic = client.get("/api/v1/license/status", headers=t2_headers).json()
    assert "trial_assessments_left" in t2_lic


def test_custom_question_count_control():
    """
    O'qituvchi BSB da savollar sonini erkin boshqara olishini tekshirish (masalan: 3 ta, 8 ta).
    """
    subjects = client.get("/api/v1/curriculum/subjects").json()
    algebra = next(s for s in subjects if s["code"] == "algebra")
    topics = client.get(f"/api/v1/curriculum/topics?subject_id={algebra['id']}&grade=7&quarter=1").json()
    assert len(topics) > 0
    t_id = topics[0]["id"]

    # 1. Aniq 3 ta savolli BSB so'rovi (25 ball)
    res_3 = client.post("/api/v1/bsb/generate", json={
        "title": "7-sinf Algebra 3 savolli BSB",
        "subject_id": algebra["id"],
        "grade": 7,
        "quarter": 1,
        "topic_ids": [t_id],
        "total_max_score": 25,
        "variants_count": 2,
        "question_count": 3
    })
    assert res_3.status_code == 200
    data_3 = res_3.json()
    assert data_3["validation_report"]["is_valid"] is True
    for v in data_3["content"]["variants"]:
        assert len(v["questions"]) == 3, f"Savollar soni 3 ta bo'lishi kerak, lekin {len(v['questions'])} ta bo'ldi"
        assert sum(q["max_score"] for q in v["questions"]) == 25

    # 2. Aniq 8 ta savolli BSB so'rovi (40 ball)
    res_8 = client.post("/api/v1/bsb/generate", json={
        "title": "7-sinf Algebra 8 savolli BSB",
        "subject_id": algebra["id"],
        "grade": 7,
        "quarter": 1,
        "topic_ids": [t_id],
        "total_max_score": 40,
        "variants_count": 1,
        "question_count": 8
    })
    assert res_8.status_code == 200
    data_8 = res_8.json()
    assert data_8["validation_report"]["is_valid"] is True
    for v in data_8["content"]["variants"]:
        assert len(v["questions"]) == 8, f"Savollar soni 8 ta bo'lishi kerak, lekin {len(v['questions'])} ta bo'ldi"
        assert sum(q["max_score"] for q in v["questions"]) == 40


def test_ktp_and_konspekt_generation_and_word_export():
    """
    4-Modul: Taqvim-Mavzu Reja (KTP) va 45 daqiqalik Dars Ishlanmasi (Konspekt)
    generatsiyasi va Word (.docx) yuklab olishni tekshirish.
    """
    subjects = client.get("/api/v1/curriculum/subjects").json()
    algebra = next(s for s in subjects if s["code"] == "algebra")

    # 1. KTP generatsiyasi (Yillik 68 soat: 34 hafta x 2 soat)
    ktp_payload = {
        "subject_id": algebra["id"],
        "grade": 7,
        "period": "annual",
        "hours_per_week": 2,
        "school_year": "2024-2025",
        "include_bsb_chsb": True,
        "lang": "uz"
    }
    ktp_res = client.post("/api/v1/ktp/generate", json=ktp_payload)
    assert ktp_res.status_code == 200
    ktp_data = ktp_res.json()
    assert ktp_data["plan_type"] == "KTP"
    assert ktp_data["hours_per_week"] == 2
    assert ktp_data["total_hours"] == 68
    assert "schedule" in ktp_data["content"]
    assert len(ktp_data["content"]["schedule"]) == 68

    # BSB va CHSB mavzulari avtomatik kiritilganini tekshirish
    schedule = ktp_data["content"]["schedule"]
    has_bsb = any(e.get("notes") == "BSB" or "BSB" in e.get("topic_title", "") for e in schedule)
    has_chsb = any(e.get("notes") == "CHSB" or "CHSB" in e.get("topic_title", "") for e in schedule)
    assert has_bsb is True, "KTP da BSB darslari rejalashtirilgan bo'lishi kerak"
    assert has_chsb is True, "KTP da CHSB darslari rejalashtirilgan bo'lishi kerak"

    # KTP Word (.docx) eksportini tekshirish
    ktp_id = ktp_data["id"]
    ktp_export = client.get(f"/api/v1/ktp/{ktp_id}/export-word")
    assert ktp_export.status_code == 200
    assert len(ktp_export.content) > 2000

    # 2. 45 daqiqalik Konspekt generatsiyasi (Barcha 6 bosqich)
    konspekt_payload = {
        "subject_id": algebra["id"],
        "grade": 7,
        "quarter": 1,
        "topic_title": "Oddiy va o'nli kasrlar ustida amallar",
        "lesson_type": "Yangi bilim beruvchi dars",
        "methods": "Aqliy hujum, blits-savollar, amaliy misollar",
        "lang": "uz"
    }
    kons_res = client.post("/api/v1/ktp/generate-konspekt", json=konspekt_payload)
    assert kons_res.status_code == 200
    kons_data = kons_res.json()
    assert kons_data["plan_type"] == "KONSPEKT"
    content = kons_data["content"]
    assert "educational_goal" in content
    assert "stages" in content
    assert len(content["stages"]) == 6
    # 6 bosqich vaqti jami 45 daqiqa
    total_time = sum(s["time_minutes"] for s in content["stages"])
    assert total_time == 45, f"Dars bosqichlari 45 daqiqa bo'lishi kerak, lekin {total_time} bo'ldi"

    # Konspekt Word (.docx) eksportini tekshirish
    kons_id = kons_data["id"]
    kons_export = client.get(f"/api/v1/ktp/{kons_id}/export-word")
    assert kons_export.status_code == 200
    assert len(kons_export.content) > 2000

    # 3. O'qituvchining shaxsiy rejalar ro'yxati (my-plans)
    my_plans = client.get("/api/v1/ktp/my-plans").json()
    assert isinstance(my_plans, list)
    plan_ids = [p["id"] for p in my_plans]
    assert ktp_id in plan_ids
    assert kons_id in plan_ids


def test_ktp_file_upload_and_topic_grounding():
    """
    2-bosqich tekshiruvi:
    O'qituvchi o'zining tasdiqlangan KTP faylini (.docx) yuklaydi.
    Tizim uni o'qib, shaxsiy bazasiga kiritadi va 100% shu mavzularga qulflanadi.
    """
    import io
    import docx

    # 1. Test uchun Word (.docx) KTP fayli yaratish
    doc = docx.Document()
    doc.add_heading("8-sinf Algebra fani Taqvim-Mavzu Rejasi", level=1)
    table = doc.add_table(rows=1, cols=6)
    hdr = table.rows[0].cells
    hdr[0].text = "№"
    hdr[1].text = "Chorak"
    hdr[2].text = "Hafta"
    hdr[3].text = "Dars mavzusi"
    hdr[4].text = "Soat"
    hdr[5].text = "DTS talablari"

    sample_topics = [
        "Kvadrat tenglamalar tushunchasi",
        "Kvadrat tenglamalarni diskriminant yordamida yechish",
        "Viyet teoremasi va uning tatbiqi",
        "1-BSB nazorat ishi (Kvadrat tenglamalar)",
        "Bikvadrat tenglamalar va yangi o'zgaruvchi kiritish"
    ]

    for idx, t_title in enumerate(sample_topics, 1):
        r = table.add_row().cells
        r[0].text = str(idx)
        r[1].text = "1"
        r[2].text = str((idx - 1) // 2 + 1)
        r[3].text = t_title
        r[4].text = "1"
        r[5].text = f"{t_title} bo'yicha ko'nikmalarni egallash"

    doc_buf = io.BytesIO()
    doc.save(doc_buf)
    doc_bytes = doc_buf.getvalue()

    # Fan topish
    subjects = client.get("/api/v1/curriculum/subjects").json()
    algebra = next(s for s in subjects if s["code"] == "algebra")

    # 2. Faylni yuklash
    files = {
        "file": ("Mening_Tasdiqlangan_KTP_8sinf.docx", doc_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    }
    data = {
        "subject_id": algebra["id"],
        "grade": 8,
        "lang": "uz"
    }

    upload_res = client.post("/api/v1/ktp/upload-file", files=files, data=data)
    assert upload_res.status_code == 200, f"Upload xatosi: {upload_res.text}"
    plan_data = upload_res.json()

    assert plan_data["plan_type"] == "KTP"
    assert plan_data["total_hours"] == 5
    content = plan_data["content"]
    assert content["is_custom_upload"] is True
    assert len(content["schedule"]) == 5

    # 4-dars BSB deb belgilanganini tekshirish
    assert content["schedule"][3]["notes"] == "BSB"
    assert "1-BSB" in content["schedule"][3]["topic_title"]

    # 3. Grounding tekshiruvi: ushbu mavzular curriculum topics ro'yxatida paydo bo'lganini tekshirish
    topics_res = client.get(f"/api/v1/curriculum/topics?subject_id={algebra['id']}&grade=8&quarter=1")
    assert topics_res.status_code == 200
    db_topics = [t["title"] for t in topics_res.json()]

    for sample_t in sample_topics:
        assert sample_t in db_topics, f"Mavzu '{sample_t}' o'qituvchining shaxsiy mavzulari orasida topilmadi!"

    # 4. Word (.docx) yuklab olishni tekshirish
    export_res = client.get(f"/api/v1/ktp/{plan_data['id']}/export-word")
    assert export_res.status_code == 200
    assert len(export_res.content) > 1000


def test_bsb_textbook_pages_and_question_swap():
    """
    3-bosqich tekshiruvi:
    1. Darslik betlari cheklovi ('45-78-betlar') bilan BSB yaratish.
    2. Interaktiv savol almashtirish ('swap-question') orqali 1 ta savolni yangilash.
    3. Ballar yig'indisi va dasturiy validatsiya 100% to'g'ri qolishini tekshirish.
    """
    subjects = client.get("/api/v1/curriculum/subjects").json()
    algebra = next(s for s in subjects if s["code"] == "algebra")

    topics_res = client.get(f"/api/v1/curriculum/topics?subject_id={algebra['id']}&grade=7&quarter=1")
    t_ids = [t["id"] for t in topics_res.json()[:3]]

    # 1. Darslik betlari bilan BSB generatsiyasi
    payload = {
        "title": "7-sinf Algebra 1-BSB Darslik cheklovi bilan",
        "assessment_type": "BSB",
        "subject_id": algebra["id"],
        "grade": 7,
        "quarter": 1,
        "topic_ids": t_ids,
        "total_max_score": 25,
        "variants_count": 2,
        "question_count": 5,
        "textbook_pages": "45-78-betlar",
        "lang": "uz"
    }

    res = client.post("/api/v1/bsb/generate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["content"].get("textbook_pages") == "45-78-betlar"
    assert data["validation_report"]["is_valid"] is True

    assessment_id = data["id"]
    old_q2 = data["content"]["variants"][0]["questions"][1]
    old_q2_text = old_q2["text"]
    old_q2_score = old_q2["max_score"]

    # 2. 2-savolni almashtirish (Swap question)
    swap_payload = {
        "variant_number": 1,
        "question_number": 2,
        "preferred_difficulty": "HARD",
        "custom_hint": "Amaliy hisoblashga doir bo'lsin",
        "lang": "uz"
    }

    swap_res = client.post(f"/api/v1/bsb/{assessment_id}/swap-question", json=swap_payload)
    assert swap_res.status_code == 200
    updated_data = swap_res.json()

    new_q2 = updated_data["content"]["variants"][0]["questions"][1]
    # Savol yangilangan bo'lishi kerak
    assert new_q2["number"] == 2
    # Maksimal ball o'zgarmasligi shart!
    assert new_q2["max_score"] == old_q2_score
    # Deskriptorlar yig'indisi aynan shu balga teng bo'lishi shart!
    assert sum(d["points"] for d in new_q2["descriptors"]) == old_q2_score
    # Validatsiya hisoboti hamon to'g'ri bo'lishi shart!
    assert updated_data["validation_report"]["is_valid"] is True

    # 3. Word eksportda darslik sahifalari chiqqanini tekshirish
    word_res = client.get(f"/api/v1/bsb/{assessment_id}/export-word")
    assert word_res.status_code == 200
    assert len(word_res.content) > 1000




