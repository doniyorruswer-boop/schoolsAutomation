import io
import json
import httpx
from typing import Dict, Any, List, Optional
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.enum.section import WD_ORIENT
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

from app.core.config import settings
from app.models.curriculum import Subject, Topic
from app.models.user import User


class KTPService:
    """
    Taqvim-Mavzu Reja (KTP) va Dars Ishlanmasi (Kundalik Konspekt) xizmati.
    Davlat ta'lim standartlari (DTS) bo'yicha shakllantiradi va rasmiy Word (.docx) chiqaradi.
    """

    @classmethod
    async def generate_ktp(
        cls,
        subject: Subject,
        grade: int,
        period: str,
        hours_per_week: int,
        school_year: str,
        include_bsb_chsb: bool,
        topics: List[Topic],
        user: User,
        lang: str = "uz"
    ) -> Dict[str, Any]:
        is_ru = lang.lower() == "ru"

        # Soatlarni hisoblash
        # O'zbekiston maktablarida: I chorak: 9 hafta, II: 7 hafta, III: 10 hafta, IV: 8 hafta. Jami: 34 o'quv haftasi.
        quarter_weeks = {1: 9, 2: 7, 3: 10, 4: 8}

        if period == "annual":
            active_quarters = [1, 2, 3, 4]
            total_weeks = 34
        else:
            q_num = int(period.split("_")[-1]) if "_" in period else 1
            active_quarters = [q_num]
            total_weeks = quarter_weeks.get(q_num, 9)

        total_hours = total_weeks * hours_per_week

        # Protsedural rejalashtirish (har doim xatosiz va tez ishlaydi)
        schedule = []
        lesson_counter = 1

        # Mavzularni choraklarga taqsimlash
        quarter_topics = {q: [t for t in topics if t.quarter == q] for q in [1, 2, 3, 4]}

        for q in active_quarters:
            weeks_count = quarter_weeks[q]
            q_topics = quarter_topics.get(q, [])
            if not q_topics:
                # Agar ushbu chorak uchun mavzu bo'lmasa, umumiy mavzularni ishlatamiz
                q_topics = topics if topics else [
                    Topic(
                        title=f"{subject.name} fani {w}-mavzu: {subject.name} asosiy tushunchalari va qoidalari" if not is_ru else f"Тема {w} по предмету {subject.name}: Основные понятия и правила",
                        learning_objectives=f"{grade}-sinf DTS talablari asosida {subject.name} qonuniyatlarini bilish va qo'llash" if not is_ru else f"Формирование базовых знаний и практических навыков согласно ГОСО {grade}-го класса",
                        quarter=q
                    )
                    for w in range(1, weeks_count + 1)
                ]

            q_total_lessons = weeks_count * hours_per_week
            topic_idx = 0

            for week in range(1, weeks_count + 1):
                for h in range(1, hours_per_week + 1):
                    # BSB va CHSB darslarini rejalashtirish
                    is_bsb = False
                    is_chsb = False

                    if include_bsb_chsb:
                        # Har chorakning 7 yoki 8-haftasida 1-BSB
                        if week == max(1, weeks_count - 2) and h == hours_per_week:
                            is_bsb = True
                        # Chorakning oxirgi haftasida CHSB
                        elif week == weeks_count and h == hours_per_week:
                            is_chsb = True

                    if is_bsb:
                        lesson_title = f"{q}-BSB nazorati. Summativ baholash topshiriqlari" if not is_ru else f"{q}-й СОР (БСБ). Суммативное оценивание"
                        lesson_type = "BSB nazorati" if not is_ru else "Контроль СОР"
                        dts_req = "O'quvchilarning chorak davomidagi bilim, ko'nikma va malakalarini BSB mezonlari asosida tekshirish" if not is_ru else "Проверка знаний и умений учащихся по критериям суммативного оценивания"
                    elif is_chsb:
                        lesson_title = f"{q}-chorak yakuniy CHSB nazorat ishi" if not is_ru else f"Итоговый СОЧ за {q}-ю четверть"
                        lesson_type = "CHSB nazorati" if not is_ru else "Итоговый СОЧ"
                        dts_req = f"{q}-chorakda o'rganilgan barcha mavzular bo'yicha yakuniy bilim darajasini aniqlash" if not is_ru else f"Итоговое оценивание уровня освоения программы за {q}-ю четверть"
                    else:
                        cur_t = q_topics[topic_idx % len(q_topics)]
                        if h == 1:
                            lesson_title = cur_t.title
                            lesson_type = "Yangi bilim beruvchi" if not is_ru else "Изучение нового материала"
                        else:
                            lesson_title = f"{cur_t.title}. Amaliy mashqlar va masalalar yechish" if not is_ru else f"Закрепление и решение задач по теме: {cur_t.title}"
                            lesson_type = "Mustahkamlovchi mashg'ulot" if not is_ru else "Закрепление знаний"

                        dts_req = cur_t.learning_objectives or (
                            f"{cur_t.title} mavzusi qoidalarini amaliy misollarda to'g'ri qo'llay oladi"
                            if not is_ru else
                            f"Умеет применять правила и понятия темы '{cur_t.title}' при решении практических задач"
                        )
                        # Navbatdagi darsga yangi mavzuni olish
                        if h == hours_per_week or len(q_topics) > q_total_lessons:
                            topic_idx += 1

                    schedule.append({
                        "lesson_number": lesson_counter,
                        "quarter": q,
                        "week_number": week,
                        "topic_title": lesson_title,
                        "hours": 1,
                        "lesson_type": lesson_type,
                        "dts_requirements": dts_req,
                        "notes": "BSB" if is_bsb else ("CHSB" if is_chsb else None)
                    })
                    lesson_counter += 1

        period_title = (
            f"{grade}-sinf {subject.name} fanidan {total_hours} soatlik to'liq yillik Taqvim-mavzu reja"
            if period == "annual" else
            f"{grade}-sinf {subject.name} fanidan {active_quarters[0]}-chorak uchun Taqvim-mavzu reja"
        )
        if is_ru:
            period_title = (
                f"Календарно-тематический план по предмету {subject.name} для {grade}-го класса на {total_hours} часов"
                if period == "annual" else
                f"Календарно-тематический план по предмету {subject.name} для {grade}-го класса на {active_quarters[0]}-ю четверть"
            )

        return {
            "title": period_title,
            "subject_name": subject.name,
            "grade": grade,
            "school_year": school_year,
            "period": period,
            "hours_per_week": hours_per_week,
            "total_hours": total_hours,
            "school_name": user.school_name or "Umumta'lim maktabi",
            "teacher_name": user.full_name or "O'qituvchi",
            "schedule": schedule
        }

    @classmethod
    async def import_ktp_file(
        cls,
        file_bytes: bytes,
        filename: str,
        subject: Subject,
        grade: int,
        user: User,
        lang: str = "uz",
        db: Any = None
    ) -> Dict[str, Any]:
        """
        O'qituvchi yuklagan KTP faylini (Word/Excel/PDF) tahlil qilish,
        mavzularini ushbu o'qituvchining shaxsiy bazasiga kiritish va
        tizimni 100% shu reja bo'yicha qulflash.
        """
        from app.services.ktp_parser import KTPFileParser

        parsed = KTPFileParser.parse_file(
            file_bytes=file_bytes,
            filename=filename,
            default_subject_name=subject.name,
            default_grade=grade,
            lang=lang
        )

        schedule = parsed.get("schedule", [])
        if not schedule:
            raise ValueError(
                "Fayldan dars mavzulari jadvali topilmadi. Iltimos, fayl jadvali yoki ro'yxati to'g'ri shakllanganini tekshiring."
                if lang != "ru" else
                "В файле не найдена таблица или список тем. Пожалуйста, проверьте структуру документа."
            )

        # O'qituvchining shaxsiy bazasiga Topic sifatida saqlash va tizimni qulflash
        if db:
            for item in schedule:
                title = item.get("topic_title", "").strip()
                q = item.get("quarter", 1)
                dts = item.get("dts_requirements", "")
                if not title:
                    continue

                existing = db.query(Topic).filter(
                    Topic.subject_id == subject.id,
                    Topic.grade == grade,
                    Topic.quarter == q,
                    Topic.title == title,
                    Topic.author_id == user.id
                ).first()

                if not existing:
                    new_topic = Topic(
                        subject_id=subject.id,
                        grade=grade,
                        quarter=q,
                        chapter=f"O'qituvchi KTP: {filename}",
                        title=title,
                        learning_objectives=dts,
                        author_id=user.id
                    )
                    db.add(new_topic)

            db.commit()

        parsed["school_name"] = user.school_name or ("Общеобразовательная школа" if lang == "ru" else "Umumta'lim maktabi")
        parsed["teacher_name"] = user.full_name or ("Учитель" if lang == "ru" else "O'qituvchi")
        parsed["is_custom_upload"] = True
        parsed["custom_badge"] = "O'qituvchi KTP si (Tasdiqlangan)" if lang != "ru" else "КТП учителя (Утверждённый)"

        return parsed

    @classmethod
    async def generate_konspekt(
        cls,
        subject: Subject,
        grade: int,
        quarter: int,
        topic_title: str,
        lesson_type: Optional[str] = None,
        methods: Optional[str] = None,
        user: Optional[User] = None,
        lang: str = "uz"
    ) -> Dict[str, Any]:
        """
        45 daqiqalik Kundalik Dars Ishlanmasi (Konspekt) generatsiyasi.
        """
        is_ru = lang.lower() == "ru"
        l_type = lesson_type or ("Изучение нового материала" if is_ru else "Yangi bilim beruvchi dars")
        l_methods = methods or ("Активизация, вопрос-ответ, блиц-опрос, решение практических задач" if is_ru else "Aqliy hujum, blits-savollar, amaliy mashqlar, guruhlarda ishlash")

        if is_ru:
            system_prompt = f"""
Ты являешься опытным методистом по стандартам школьного образования Республики Узбекистан.
Твоя задача: Составить подробную, профессиональную поурочную разработку (конспект урока на 45 минут) по предмету {subject.name} для {grade}-го класса.

СТРОГИЕ ТРЕБОВАНИЯ:
1. Тема урока: "{topic_title}". Язык: РУССКИЙ.
2. Конспект должен содержать 6 обязательных этапов с конкретными примерами, формулами и задачами:
   - Организационный момент (3 мин)
   - Актуализация опорных знаний и опрос (7 мин) — напиши 3 конкретных вопроса и правильные ответы на них.
   - Объяснение нового материала (15 мин) — подробно объясни правила, напиши примеры на доске с полным решением.
   - Закрепление новой темы (12 мин) — напиши 3 конкретные практические задачи для самостоятельной работы учеников.
   - Подведение итогов и оценивание (5 мин) — критерии оценки.
   - Домашнее задание и инструктаж (3 мин) — конкретные номера упражнений и творческое задание.
3. Ответ верни ИСКЛЮЧИТЕЛЬНО в формате JSON без markdown:
{{
  "educational_goal": "Обучающая цель...",
  "developmental_goal": "Развивающая цель...",
  "upbringing_goal": "Воспитательная цель...",
  "competencies": "Базовые и предметные компетенции...",
  "lesson_equipment": "Доска, учебник, раздаточный дидактический материал, слайды",
  "stages": [
    {{
      "stage_number": "I",
      "title": "Организационный момент",
      "time_minutes": 3,
      "teacher_activity": "Приветствие, отметка присутствующих, психологический настрой...",
      "student_activity": "Готовят рабочее место, настраиваются на продуктивный урок...",
      "content": "Организация порядка в классе, мотивация к изучению темы."
    }},
    {{
      "stage_number": "II",
      "title": "Актуализация опорных знаний (Блиц-опрос)",
      "time_minutes": 7,
      "teacher_activity": "Задает вопросы по пройденной теме...",
      "student_activity": "Отвечают устно, формулируют правила...",
      "content": "1-вопрос: ... (Ответ: ...)\\n2-вопрос: ... (Ответ: ...)"
    }},
    {{
      "stage_number": "III",
      "title": "Объяснение новой темы",
      "time_minutes": 15,
      "teacher_activity": "Объясняет теоретический материал, демонстрирует формулы и решение примеров на доске...",
      "student_activity": "Слушают учителя, записывают правила и примеры в тетрадь...",
      "content": "Теоретические сведения: ...\\nПример на доске №1: ... Решение: ..."
    }},
    {{
      "stage_number": "IV",
      "title": "Закрепление изученного материала",
      "time_minutes": 12,
      "teacher_activity": "Раздает карточки с практическими заданиями, направляет учащихся...",
      "student_activity": "Решают задачи индивидуально и у доски, комментируют шаги решения...",
      "content": "Задание 1: ...\\nЗадание 2: ...\\nЗадание 3: ..."
    }},
    {{
      "stage_number": "V",
      "title": "Подведение итогов урока и оценивание",
      "time_minutes": 5,
      "teacher_activity": "Обобщает выводы по уроку, комментирует баллы активных учеников...",
      "student_activity": "Проводят самооценку, делятся выводами...",
      "content": "Рефлексия: Что нового узнали? Оценивание активных учеников."
    }},
    {{
      "stage_number": "VI",
      "title": "Домашнее задание",
      "time_minutes": 3,
      "teacher_activity": "Задает задания из учебника, разъясняет порядок выполнения...",
      "student_activity": "Записывают домашнее задание в дневник...",
      "content": "Упражнения из учебника №... и творческое мини-задание."
    }}
  ],
  "homework": "Выучить правила параграфа, решить задачи №... на стр. ..."
}}
"""
        else:
            system_prompt = f"""
Sen O'zbekiston Respublikasi maktab ta'limi bo'yicha oliy toifali metodistsan.
Vazifang: {subject.name} fanidan {grade}-sinf uchun "{topic_title}" mavzusida 45 daqiqalik dars ishlanmasi (konspekt) tuzish.

QAT'IY TALABLAR:
1. Mavzu: "{topic_title}". Til: O'ZBEK TILI.
2. Dars 6 ta bosqichdan iborat bo'lishi va har birida aniq misollar, savollar va formulalar yozilishi SHART:
   - I. Tashkiliy qism (3 min)
   - II. O'tgan mavzuni takrorlash va faollashtirish (7 min) — 3 ta aniq savol va ularning javoblarini yoz.
   - III. Yangi mavzu bayoni (15 min) — qoidalar va doskada yechiladigan 2 ta namunaviy misol to'liq yechimi bilan.
   - IV. Yangi mavzuni mustahkamlash (12 min) — o'quvchilar mustaqil va doskada yechadigan 3 ta amaliy mashq.
   - V. Dars yakuni va baholash (5 min) — rag'batlantirish va mezonlar.
   - VI. Uyga vazifa (3 min) — darslikdagi mashqlar va ko'rsatmalar.
3. Javobni FAQAT quyidagi JSON formatida ber:
{{
  "educational_goal": "Mavzu bo'yicha nazariy qoidalar va hisoblash ko'nikmalarini to'liq shakllantirish",
  "developmental_goal": "Mantiqiy fikrlash, tahlil qilish va amaliy masalalarni erkin yechish qobiliyatini rivojlantirish",
  "upbringing_goal": "Aniqlik, fanga qiziqish va guruhda hamkorlikda ishlash madaniyatini tarbiyalash",
  "competencies": "Tayanch va fanga oid kompetensiyalar: matematik savodxonlik, axborot bilan ishlash",
  "lesson_equipment": "Darslik, ko'rgazmali plakatlar, tarqatma kartochkalar, slaydlar",
  "stages": [
    {{
      "stage_number": "I",
      "title": "Tashkiliy qism",
      "time_minutes": 3,
      "teacher_activity": "Salomlashish, davomatni aniqlash, o'quvchilar diqqatini darsga jalb qilish",
      "student_activity": "Darsga tayyorlanadilar, o'quv qurollarini hozirlaydilar",
      "content": "Salomlashish, dars shiori va ijobiy ruhiy kayfiyat uyg'otish."
    }},
    {{
      "stage_number": "II",
      "title": "O'tgan mavzuni takrorlash (Blits-so'rov)",
      "time_minutes": 7,
      "teacher_activity": "O'tilgan qoidalar bo'yicha blits-savollar beradi, javoblarni to'ldiradi",
      "student_activity": "Savollarga javob beradilar, misollarni og'zaki tahlil qiladilar",
      "content": "1-savol: ... (Javob: ...)\\n2-savol: ... (Javob: ...)"
    }},
    {{
      "stage_number": "III",
      "title": "Yangi mavzu bayoni",
      "time_minutes": 15,
      "teacher_activity": "Yangi qoidalarni tushuntiradi, doskada namunaviy masalalarni bosqichma-bosqich yechib ko'rsatadi",
      "student_activity": "Qoidalarni tinglaydilar, muhim tushuncha va namunalarni daftarga qayd etadilar",
      "content": "Nazariy qoidalar: ...\\nDoskadagi 1-namunaviy misol: ... Yechimi: ..."
    }},
    {{
      "stage_number": "IV",
      "title": "Yangi mavzuni mustahkamlash",
      "time_minutes": 12,
      "teacher_activity": "O'quvchilarga mustaqil va juftlikda yechish uchun amaliy mashqlar beradi, nazorat qiladi",
      "student_activity": "Misollarni mustaqil daftarda va doskada bajaradilar, fikr almashadilar",
      "content": "1-mashq: ...\\n2-mashq: ...\\n3-mashq: ..."
    }},
    {{
      "stage_number": "V",
      "title": "Dars yakuni va baholash",
      "time_minutes": 5,
      "teacher_activity": "Mavzu bo'yicha xulosa yasaydi, faol o'quvchilarni baholaydi va rag'batlantiradi",
      "student_activity": "O'zlashtirish darajasini tahlil qiladilar, savollar beradilar",
      "content": "Xulosalash: Bugun nimani o'rgandik? O'quvchilarni baholash mezonlari."
    }},
    {{
      "stage_number": "VI",
      "title": "Uyga vazifa va ko'rsatmalar",
      "time_minutes": 3,
      "teacher_activity": "Uyga vazifani e'lon qiladi, bajarish qoidalari bo'yicha tushuntirish beradi",
      "student_activity": "Uy vazifasini kundalikka qayd qiladilar",
      "content": "Darslikdagi tegishli mavzu mashqlari va ijodiy topshiriq."
    }}
  ],
  "homework": "Mavzu qoidalarini yod olish, darslikdagi topshiriqlarni bajarish."
}}
"""

        user_prompt = f"Mavzu: {topic_title}\nFan: {subject.name}\nSinf: {grade}-sinf\nDars turi: {l_type}\nMetodlar: {l_methods}"

        if settings.GEMINI_API_KEY:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
                payload = {
                    "contents": [{"parts": [{"text": system_prompt + "\n\n" + user_prompt}]}],
                    "generationConfig": {"temperature": 0.3, "responseMimeType": "application/json"}
                }
                async with httpx.AsyncClient(timeout=45.0) as client:
                    resp = await client.post(url, json=payload)
                    if resp.status_code == 200:
                        parts = resp.json().get("candidates", [{}])[0].get("content", {}).get("parts", [])
                        text = "".join([p.get("text", "") for p in parts if "text" in p]).strip()
                        if text.startswith("```"):
                            import re
                            text = re.sub(r"^```(?:json)?\n?", "", text)
                            text = re.sub(r"\n?```$", "", text)
                        return json.loads(text.strip())
            except Exception as e:
                print(f"[Konspekt AI Error] {e}")

        # Fallback procedural konspekt
        return cls._generate_fallback_konspekt(subject, grade, topic_title, l_type, l_methods, is_ru)

    @classmethod
    def _generate_fallback_konspekt(cls, subject: Subject, grade: int, topic: str, l_type: str, methods: str, is_ru: bool) -> Dict[str, Any]:
        if is_ru:
            return {
                "educational_goal": f"Обеспечить глубокое понимание темы '{topic}', научить применять алгоритмы решения на практике.",
                "developmental_goal": f"Развивать логическое и аналитическое мышление, математическую речь и самостоятельность.",
                "upbringing_goal": "Воспитывать культуру математических записей, усидчивость и интерес к изучению предмета.",
                "competencies": "Учебно-познавательная, коммуникативная и предметная грамотность.",
                "lesson_equipment": "Учебник, классная доска, индивидуальные карточки, проектор.",
                "stages": [
                    {
                        "stage_number": "I",
                        "title": "Организационный момент",
                        "time_minutes": 3,
                        "teacher_activity": "Приветствует учащихся, проверяет готовность к уроку и посещаемость.",
                        "student_activity": "Приветствуют учителя, готовят тетради и учебные принадлежности.",
                        "content": "Создание доброжелательной рабочей атмосферы в классе."
                    },
                    {
                        "stage_number": "II",
                        "title": "Актуализация опорных знаний (Блиц-опрос)",
                        "time_minutes": 7,
                        "teacher_activity": "Проводит короткую разминку и фронтальный опрос по базовым понятиям.",
                        "student_activity": "Отвечают на вопросы, вспоминают ключевые свойства и правила.",
                        "content": f"1. Каковы основные свойства по теме '{topic}'?\\n2. Какие формулы применяются при вычислениях?\\n3. Проверка домашнего задания."
                    },
                    {
                        "stage_number": "III",
                        "title": "Объяснение нового материала",
                        "time_minutes": 15,
                        "teacher_activity": "Излагает теоретические положения, показывает образцы оформления решений на доске.",
                        "student_activity": "Внимательно слушают, задают уточняющие вопросы, конспектируют примеры.",
                        "content": f"Определение и ключевые правила темы '{topic}'. Образец 1: пошаговое применение алгоритма с подробным комментарием учителя."
                    },
                    {
                        "stage_number": "IV",
                        "title": "Первичное закрепление знаний",
                        "time_minutes": 12,
                        "teacher_activity": "Организует работу учащихся у доски и в тетрадях, оказывает индивидуальную помощь.",
                        "student_activity": "Выполняют практические упражнения, комментируют этапы решения.",
                        "content": f"Задание №1: базовые вычисления. Задание №2: прикладная задача повышенной сложности."
                    },
                    {
                        "stage_number": "V",
                        "title": "Итоги урока и рефлексия",
                        "time_minutes": 5,
                        "teacher_activity": "Обобщает пройденный материал, выставляет и комментирует отметки.",
                        "student_activity": "Анализируют свои успехи и трудности на уроке, подводят итоги.",
                        "content": "Что получилось лучше всего? Какие моменты требуют повторения?"
                    },
                    {
                        "stage_number": "VI",
                        "title": "Домашнее задание",
                        "time_minutes": 3,
                        "teacher_activity": "Формулирует домашнее задание, проводит краткий инструктаж.",
                        "student_activity": "Фиксируют номера заданий в дневниках.",
                        "content": f"Параграф по теме '{topic}', обязательные упражнения из учебника."
                    }
                ],
                "homework": f"Повторить правила по теме '{topic}', выполнить упражнения из учебника."
            }
        else:
            return {
                "educational_goal": f"'{topic}' mavzusi bo'yicha nazariy qoidalar va hisoblash ko'nikmalarini chuqur egallash.",
                "developmental_goal": "Mantiqiy tafakkur, hisoblash tezligi va xulosalar chiqarish qobiliyatini rivojlantirish.",
                "upbringing_goal": "Mas'uliyat, fanga qiziqish va tartibli daftarga yozish odatini shakllantirish.",
                "competencies": "Matematik savodxonlik, o'z-o'zini rivojlantirish va axborot bilan ishlash.",
                "lesson_equipment": "Darslik, sinf doskasi, tarqatma topshiriqlar, ko'rgazmali vositalar.",
                "stages": [
                    {
                        "stage_number": "I",
                        "title": "Tashkiliy qism",
                        "time_minutes": 3,
                        "teacher_activity": "Salomlashadi, yo'qlama qiladi, dars jihozlarini tekshiradi.",
                        "student_activity": "Salomlashadilar, darsga tayyorlanadilar.",
                        "content": "Darsning boshlanishi, ijobiy psixologik iqlim yaratish."
                    },
                    {
                        "stage_number": "II",
                        "title": "O'tgan mavzuni takrorlash (Blits-so'rov)",
                        "time_minutes": 7,
                        "teacher_activity": "Mavzu bo'yicha blits-savollar beradi, faollikni oshiradi.",
                        "student_activity": "Savollarga aniq va lo'nda javob beradilar.",
                        "content": f"1. '{topic}' ga bog'liq asosiy qoidalar qaysilar?\\n2. Namunaviy hisoblash qanday bajariladi?\\n3. Uy vazifasini tekshirish."
                    },
                    {
                        "stage_number": "III",
                        "title": "Yangi mavzu bayoni",
                        "time_minutes": 15,
                        "teacher_activity": "Yangi qoidalarni doskada ko'rgazmali tushuntiradi, namunaviy misollarni yechib beradi.",
                        "student_activity": "Diqqat bilan tinglaydilar, muhim qoidalarni daftarga qayd qiladilar.",
                        "content": f"'{topic}' mavzusining nazariy asosi va formulalari. Doskada 1- va 2-namunaviy misollar to'liq yechimi bilan."
                    },
                    {
                        "stage_number": "IV",
                        "title": "Yangi mavzuni mustahkamlash",
                        "time_minutes": 12,
                        "teacher_activity": "O'quvchilarga amaliy mashqlar beradi, doskaga chaqiradi va yo'naltiradi.",
                        "student_activity": "Daftarda va doskada mashqlarni bosqichma-bosqich bajaradilar.",
                        "content": "Darslikdagi tegishli amaliy misollar va mustaqil yechish uchun tarqatma kartochkalar."
                    },
                    {
                        "stage_number": "V",
                        "title": "Dars yakuni va baholash",
                        "time_minutes": 5,
                        "teacher_activity": "Dars natijalarini umumlashtiradi, faol o'quvchilarni baholaydi.",
                        "student_activity": "Darsdan olgan xulosalarini aytadilar.",
                        "content": "Mavzu bo'yicha umumiy xulosa. O'quvchilar bilimini rag'batlantirish va baholash."
                    },
                    {
                        "stage_number": "VI",
                        "title": "Uyga vazifa va ko'rsatmalar",
                        "time_minutes": 3,
                        "teacher_activity": "Uyga vazifani tushuntiradi, qiyin nuqtalari bo'yicha yo'l-yo'riq beradi.",
                        "student_activity": "Uy vazifasini kundalikka yozib oladilar.",
                        "content": f"'{topic}' mavzusi bo'yicha darslikdagi mashqlar va qo'shimcha amaliy topshiriqlar."
                    }
                ],
                "homework": f"'{topic}' mavzusini o'qish, darslikdagi mashqlarni bajarish."
            }

    @classmethod
    def export_ktp_word(cls, content: Dict[str, Any], user: User, lang: str = "uz") -> io.BytesIO:
        """
        KTP ni Albom (Landscape) formatida rasmiy Word jadval shaklida yaratadi.
        """
        is_ru = lang.lower() == "ru"
        doc = Document()

        # Albom (Landscape) orientatsiyasini o'rnatish
        section = doc.sections[0]
        section.orientation = WD_ORIENT.LANDSCAPE
        section.page_width, section.page_height = Inches(11.69), Inches(8.27) # A4 Landscape
        section.top_margin = Inches(0.6)
        section.bottom_margin = Inches(0.6)
        section.left_margin = Inches(0.6)
        section.right_margin = Inches(0.6)

        # 1. Rasmiy Tasdiqlash Shapkalari (Ikki ustunli: Kelishildi va Tasdiqlayman)
        p_top = doc.add_paragraph()
        p_top.alignment = WD_ALIGN_PARAGRAPH.CENTER
        ministry_txt = (
            "МИНИСТЕРСТВО ДОШКОЛЬНОГО И ШКОЛЬНОГО ОБРАЗОВАНИЯ РЕСПУБЛИКИ УЗБЕКИСТАН\n"
            if is_ru else
            "O'ZBEKISTON RESPUBLIKASI MAKTABGACHA VA MAKTAB TA'LIMI VAZIRLIGI\n"
        )
        r_min = p_top.add_run(ministry_txt)
        r_min.font.size = Pt(9.5)
        r_min.bold = True

        # Tasdiqlash jadvali (Kelishildi / Tasdiqlayman)
        approval_table = doc.add_table(rows=1, cols=2)
        approval_table.alignment = WD_TABLE_ALIGNMENT.CENTER
        approval_table.autofit = False

        left_cell = approval_table.cell(0, 0)
        right_cell = approval_table.cell(0, 1)

        left_p = left_cell.paragraphs[0]
        left_txt = (
            "«СОГЛАСОВАНО»\nРуководитель метод-объединения:\n________________ / ____________ /\n«___» _________ 2024 г."
            if is_ru else
            "«KELISHILDI»\nMetodbirlashma rahbari:\n________________ / ____________ /\n«___» _________ 2024 yil"
        )
        r_left = left_p.add_run(left_txt)
        r_left.font.size = Pt(9)

        right_p = right_cell.paragraphs[0]
        right_p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        right_txt = (
            "«УТВЕРЖДАЮ»\nЗам. директора по УВР (Завуч):\n________________ / ____________ /\n«___» _________ 2024 г."
            if is_ru else
            "«TASDIQLAYMAN»\nO'quv ishlari bo'yicha direktor o'rinbosari:\n________________ / ____________ /\n«___» _________ 2024 yil"
        )
        r_right = right_p.add_run(right_txt)
        r_right.font.size = Pt(9)

        # Sarlavha
        title_p = doc.add_paragraph()
        title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        title_p.paragraph_format.space_before = Pt(8)
        title_p.paragraph_format.space_after = Pt(4)

        subj = content.get("subject_name", "Fan")
        gr = content.get("grade", 7)
        tot_hrs = content.get("total_hours", 68)
        hpw = content.get("hours_per_week", 2)
        sch_yr = content.get("school_year", "2024-2025")

        ktp_header = (
            f"КАЛЕНДАРНО-ТЕМАТИЧЕСКИЙ ПЛАН (КТП)\nпо предмету {subj.upper()} для {gr}-го класса на {sch_yr} учебный год\n(Всего: {tot_hrs} часов, в неделю: {hpw} часа)"
            if is_ru else
            f"TAQVIM-MAVZU REJA (KTP)\n{gr}-sinf {subj.upper()} fani uchun {sch_yr}-o'quv yili\n(Jami: {tot_hrs} soat, haftasiga: {hpw} soat)"
        )
        r_t = title_p.add_run(ktp_header)
        r_t.font.size = Pt(11)
        r_t.bold = True

        # O'qituvchi va maktab haqida ma'lumot
        info_p = doc.add_paragraph()
        info_p.paragraph_format.space_after = Pt(6)
        teacher_str = f"O'qituvchi: {user.full_name or '________________'}" if not is_ru else f"Учитель: {user.full_name or '________________'}"
        default_school = "Общеобразовательная школа" if is_ru else "Umumta'lim maktabi"
        school_name = user.school_name or default_school
        school_str = f"Ta'lim muassasasi: {school_name}" if not is_ru else f"Школа: {school_name}"
        info_p.add_run(f"{school_str}  |  {teacher_str}").italic = True

        # KTP Jadvali
        headers = ["№", "Chorak", "Hafta", "Dars mavzusi", "Soat", "Dars turi", "DTS talablari (O'quv maqsadlari)", "Izoh"] if not is_ru else ["№", "Четверть", "Неделя", "Тема урока", "Часы", "Тип урока", "Требования ГОСО (Цели обучения)", "Примечание"]

        schedule = content.get("schedule", [])
        table = doc.add_table(rows=len(schedule) + 1, cols=len(headers))
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        table.autofit = False

        # Ustun kengliklari (Landscape)
        col_widths = [Inches(0.4), Inches(0.65), Inches(0.6), Inches(3.2), Inches(0.5), Inches(1.3), Inches(3.1), Inches(0.8)]

        # Sarlavha qatori
        hdr_row = table.rows[0]
        hdr_row.height = Pt(22)
        for i, title in enumerate(headers):
            cell = hdr_row.cells[i]
            cell.width = col_widths[i]
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            shading = parse_xml(r'<w:shd {} w:fill="E2E8F0"/>'.format(nsdecls('w')))
            cell._tc.get_or_add_tcPr().append(shading)
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            run = p.add_run(title)
            run.bold = True
            run.font.size = Pt(8.5)

        # Dars qatorlari
        for idx, item in enumerate(schedule, start=1):
            row = table.rows[idx]
            is_control = item.get("notes") in ["BSB", "CHSB"] or "BSB" in item.get("topic_title", "") or "CHSB" in item.get("topic_title", "")

            # BSB / CHSB bo'lsa och sariq rang bilan ajratish
            bg_color = "FEF9C3" if is_control else ("F8FAFC" if idx % 2 == 0 else "FFFFFF")

            row_data = [
                str(item.get("lesson_number", idx)),
                f"{item.get('quarter', 1)}-ch." if not is_ru else f"{item.get('quarter', 1)}-я",
                f"{item.get('week_number', 1)}",
                item.get("topic_title", ""),
                str(item.get("hours", 1)),
                item.get("lesson_type", ""),
                item.get("dts_requirements", ""),
                item.get("notes") or ""
            ]

            for c_idx, val in enumerate(row_data):
                cell = row.cells[c_idx]
                cell.width = col_widths[c_idx]
                cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
                if bg_color != "FFFFFF":
                    shd = parse_xml(r'<w:shd {} w:fill="{}"/>'.format(nsdecls('w'), bg_color))
                    cell._tc.get_or_add_tcPr().append(shd)

                p = cell.paragraphs[0]
                # Raqamlar markazda, matn chapda
                if c_idx in [0, 1, 2, 4, 7]:
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                else:
                    p.alignment = WD_ALIGN_PARAGRAPH.LEFT

                run = p.add_run(val)
                run.font.size = Pt(8)
                if is_control:
                    run.bold = True

        # Hujjat chegaralarini ingichka qilish
        cls._set_table_borders(table)

        buffer = io.BytesIO()
        doc.save(buffer)
        buffer.seek(0)
        return buffer

    @classmethod
    def export_konspekt_word(cls, content: Dict[str, Any], user: User, lang: str = "uz") -> io.BytesIO:
        """
        45 daqiqalik Dars Ishlanmasini (Konspekt) Kitobiy (Portrait) rasmiy Word formatida yaratadi.
        """
        is_ru = lang.lower() == "ru"
        doc = Document()

        for s in doc.sections:
            s.top_margin = Inches(0.8)
            s.bottom_margin = Inches(0.8)
            s.left_margin = Inches(0.8)
            s.right_margin = Inches(0.8)

        # Sarlavha
        p_top = doc.add_paragraph()
        p_top.alignment = WD_ALIGN_PARAGRAPH.CENTER
        title_txt = "KUNDALIK DARS ISHLANMASI (KONSPEKT)" if not is_ru else "ПОУРОЧНАЯ РАЗРАБОТКА УРОКА (КОНСПЕКТ)"
        r_top = p_top.add_run(title_txt)
        r_top.font.size = Pt(13)
        r_top.bold = True

        # Pasport jadvali (Fan, Sinf, Sana, O'qituvchi)
        info_table = doc.add_table(rows=3, cols=2)
        info_table.alignment = WD_TABLE_ALIGNMENT.CENTER
        info_table.autofit = False

        c_w1, c_w2 = Inches(3.4), Inches(3.4)

        sch_name = user.school_name or ("Общеобразовательная школа" if is_ru else "Umumta'lim maktabi")
        teach_name = user.full_name or ("Учитель" if is_ru else "O'qituvchi")
        subj = content.get("subject_name", "Fan")
        gr = content.get("grade", 7)
        top_title = content.get("topic_title", "Mavzu")

        fields = [
            (f"Maktab: {sch_name}" if not is_ru else f"Школа: {sch_name}", f"Fan: {subj}" if not is_ru else f"Предмет: {subj}"),
            (f"Sinf: {gr}-sinf" if not is_ru else f"Класс: {gr}-й класс", f"O'qituvchi: {teach_name}" if not is_ru else f"Учитель: {teach_name}"),
            (f"Dars mavzusi: {top_title}" if not is_ru else f"Тема урока: {top_title}", "Vaqti: 45 daqiqa" if not is_ru else "Время: 45 минут")
        ]

        for r_idx, (c1, c2) in enumerate(fields):
            row = info_table.rows[r_idx]
            for col_i, text in enumerate([c1, c2]):
                cell = row.cells[col_i]
                cell.width = Inches(3.4)
                p = cell.paragraphs[0]
                r = p.add_run(text)
                r.font.size = Pt(9.5)
                if "Dars mavzusi" in text or "Тема урока" in text:
                    r.bold = True

        cls._set_table_borders(info_table)

        # Dars maqsadlari bloki
        doc.add_paragraph().paragraph_format.space_after = Pt(2)
        goals_p = doc.add_paragraph()
        goals_p.paragraph_format.space_after = Pt(4)
        goals_title = "DARS MAQSADLARI VA VAZIFALARI:" if not is_ru else "ЦЕЛИ И ЗАДАЧИ УРОКА:"
        r_gt = goals_p.add_run(goals_title)
        r_gt.bold = True
        r_gt.font.size = Pt(10)

        goals_items = [
            ("1. Ta'limiy maqsad: " if not is_ru else "1. Обучающая цель: ", content.get("educational_goal", "")),
            ("2. Tarbiyaviy maqsad: " if not is_ru else "2. Воспитательная цель: ", content.get("upbringing_goal", "")),
            ("3. Rivojlantiruvchi maqsad: " if not is_ru else "3. Развивающая цель: ", content.get("developmental_goal", "")),
            ("4. Shakllanadigan kompetensiyalar: " if not is_ru else "4. Компетенции: ", content.get("competencies", "")),
            ("5. Dars jihozlari: " if not is_ru else "5. Оборудование: ", content.get("lesson_equipment", ""))
        ]

        for lbl, val in goals_items:
            gp = doc.add_paragraph()
            gp.paragraph_format.space_after = Pt(2)
            r_l = gp.add_run(lbl)
            r_l.bold = True
            r_l.font.size = Pt(9)
            r_v = gp.add_run(val)
            r_v.font.size = Pt(9)

        # 45 daqiqalik Dars Borishi Jadvali
        stages_head = doc.add_paragraph()
        stages_head.paragraph_format.space_before = Pt(6)
        stages_head.paragraph_format.space_after = Pt(3)
        st_title = "DARSNING 45 DAQIQALIK TEXNOLOGIK XARITASI (BORISHI):" if not is_ru else "ТЕХНОЛОГИЧЕСКАЯ КАРТА УРОКА (ХОД УРОКА):"
        r_sth = stages_head.add_run(st_title)
        r_sth.bold = True
        r_sth.font.size = Pt(10)

        stages = content.get("stages", [])
        st_headers = ["Bosqich va vaqt", "O'qituvchi faoliyati", "O'quvchi faoliyati", "Dars mazmuni va misollar"] if not is_ru else ["Этап и время", "Деятельность учителя", "Деятельность учащихся", "Содержание и примеры"]

        stage_table = doc.add_table(rows=len(stages) + 1, cols=4)
        stage_table.alignment = WD_TABLE_ALIGNMENT.CENTER
        stage_table.autofit = False

        s_widths = [Inches(1.2), Inches(1.8), Inches(1.6), Inches(2.2)]

        # Sarlavha qatori
        hdr_s = stage_table.rows[0]
        for idx, htitle in enumerate(st_headers):
            cell = hdr_s.cells[idx]
            cell.width = s_widths[idx]
            shading = parse_xml(r'<w:shd {} w:fill="E2E8F0"/>'.format(nsdecls('w')))
            cell._tc.get_or_add_tcPr().append(shading)
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            run = p.add_run(htitle)
            run.bold = True
            run.font.size = Pt(8.5)

        for s_idx, st in enumerate(stages, start=1):
            row = stage_table.rows[s_idx]
            data = [
                f"{st.get('stage_number', '')}. {st.get('title', '')}\n({st.get('time_minutes', 5)} min)",
                st.get("teacher_activity", ""),
                st.get("student_activity", ""),
                st.get("content", "")
            ]
            for col_i, txt in enumerate(data):
                cell = row.cells[col_i]
                cell.width = s_widths[col_i]
                p = cell.paragraphs[0]
                run = p.add_run(txt)
                run.font.size = Pt(8.5)

        cls._set_table_borders(stage_table)

        # Uyga vazifa qismi
        hw_p = doc.add_paragraph()
        hw_p.paragraph_format.space_before = Pt(8)
        r_hw_title = hw_p.add_run("UYGA VAZIFA: " if not is_ru else "ДОМАШНЕЕ ЗАДАНИЕ: ")
        r_hw_title.bold = True
        r_hw_title.font.size = Pt(10)
        r_hw_val = hw_p.add_run(content.get("homework", "Darslikdagi mashqlarni bajarish."))
        r_hw_val.font.size = Pt(9.5)
        r_hw_val.italic = True

        buffer = io.BytesIO()
        doc.save(buffer)
        buffer.seek(0)
        return buffer

    @staticmethod
    def _set_table_borders(table):
        tblPr = table._tbl.tblPr
        borders = parse_xml(
            r'<w:tblBorders {} >'
            r'<w:top w:val="single" w:sz="4" w:space="0" w:color="94A3B8"/>'
            r'<w:bottom w:val="single" w:sz="4" w:space="0" w:color="94A3B8"/>'
            r'<w:left w:val="single" w:sz="4" w:space="0" w:color="94A3B8"/>'
            r'<w:right w:val="single" w:sz="4" w:space="0" w:color="94A3B8"/>'
            r'<w:insideH w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>'
            r'<w:insideV w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>'
            r'</w:tblBorders>'.format(nsdecls('w'))
        )
        tblPr.append(borders)
