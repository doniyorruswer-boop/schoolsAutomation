import io
import re
from typing import Dict, Any, List, Optional, Tuple
from docx import Document
import openpyxl
import pypdf


class KTPFileParser:
    """
    O'qituvchilar yuklagan Taqvim-mavzu reja (KTP) fayllarini (Word .docx, Excel .xlsx, PDF)
    tahlil qiluvchi va undagi mavzular, dars soatlari, choraklar hamda BSB/CHSB
    rejasini ajratib oluvchi aqlli servis.
    """

    QUARTER_KEYWORDS = ["chorak", "choragi", "chetvert", "четверть", "четверти", "ч-ть", "ч-к"]
    WEEK_KEYWORDS = ["hafta", "haftasi", "nedelya", "неделя", "нед"]
    TOPIC_KEYWORDS = [
        "mavzu", "dars mavzusi", "mavzular", "тема", "тема урока", "наименование тем", 
        "darsning mavzusi", "mashg'ulot mavzusi", "содержание", "mavzu nomi", "темы"
    ]
    HOURS_KEYWORDS = [
        "soat", "soati", "dars soati", "ajratilgan soat", "час", "часы", "кол-во часов", 
        "количество часов", "соат", "соати", "ч."
    ]
    NUMBER_KEYWORDS = ["№", "t/r", "tr", "tartib", "dars", "номер", "№ п/п", "п/п", "№ урока", "n", "no"]
    OBJECTIVES_KEYWORDS = [
        "dts", "o'quv maqsad", "maqsad", "talab", "standart", "ko'nikma", 
        "требования", "цели", "цели урока", "требования госо", "ожидаемые результаты", "компетенции"
    ]
    NOTES_KEYWORDS = ["izoh", "eslatma", "bsb", "chsb", "sor", "soch", "примечание", "контроль"]

    @classmethod
    def parse_file(
        cls, 
        file_bytes: bytes, 
        filename: str, 
        default_subject_name: str = "", 
        default_grade: int = 7,
        lang: str = "uz"
    ) -> Dict[str, Any]:
        ext = filename.lower().split(".")[-1] if "." in filename else ""

        if ext == "docx":
            return cls._parse_docx(file_bytes, filename, default_subject_name, default_grade, lang)
        elif ext in ["xlsx", "xls"]:
            return cls._parse_xlsx(file_bytes, filename, default_subject_name, default_grade, lang)
        elif ext == "pdf":
            return cls._parse_pdf(file_bytes, filename, default_subject_name, default_grade, lang)
        else:
            raise ValueError(f"Qo'llab-quvvatlanmaydigan fayl formati: .{ext}. Faqat .docx, .xlsx va .pdf fayllar qabul qilinadi.")

    @classmethod
    def _parse_docx(
        cls, 
        file_bytes: bytes, 
        filename: str, 
        default_subject_name: str, 
        default_grade: int,
        lang: str
    ) -> Dict[str, Any]:
        stream = io.BytesIO(file_bytes)
        doc = Document(stream)

        # Matn sarlavhasidan fan, sinf va o'quv yilini aniqlash
        header_text = "\n".join([p.text for p in doc.paragraphs[:15]])
        detected_grade = cls._detect_grade(header_text) or default_grade
        detected_year = cls._detect_year(header_text) or "2024-2025"

        schedule = []
        lesson_counter = 1
        current_quarter = 1

        # Hujjatdagi barcha jadvallarni ko'rib chiqish
        for table in doc.tables:
            rows = table.rows
            if not rows:
                continue

            col_map = None
            header_row_idx = 0

            for r_idx in range(min(5, len(rows))):
                row_cells = [c.text.strip() for c in rows[r_idx].cells]
                joined_row_text = " ".join(row_cells).lower()
                q_match = cls._detect_quarter_in_text(joined_row_text)
                if q_match:
                    current_quarter = q_match

                col_map = cls._map_columns(row_cells)
                if col_map.get("topic") is not None:
                    header_row_idx = r_idx
                    break

            if col_map is None or col_map.get("topic") is None:
                first_row = [c.text.strip() for c in rows[0].cells]
                col_map = cls._fallback_col_map(len(first_row))
                header_row_idx = 0

            for r_idx in range(header_row_idx + 1, len(rows)):
                cells = [c.text.strip() for c in rows[r_idx].cells]
                if not any(cells):
                    continue

                row_text = " ".join(cells)
                q_in_row = cls._detect_quarter_in_text(row_text)
                if q_in_row and len([x for x in cells if x]) <= 2:
                    current_quarter = q_in_row
                    continue

                topic_cell_idx = col_map.get("topic")
                if topic_cell_idx is None or topic_cell_idx >= len(cells):
                    continue

                topic_title = cells[topic_cell_idx].strip()
                # Agar qator shunchaki sarlavhaning takrori bo'lsa o'tkazib yuboramiz
                if not topic_title or topic_title.lower() in cls.TOPIC_KEYWORDS:
                    continue

                # Qator ichida chorak bormi?
                if col_map.get("quarter") is not None and col_map["quarter"] < len(cells):
                    q_val = cls._parse_int(cells[col_map["quarter"]])
                    if q_val and 1 <= q_val <= 4:
                        current_quarter = q_val

                # Hafta
                week_num = None
                if col_map.get("week") is not None and col_map["week"] < len(cells):
                    week_num = cls._parse_int(cells[col_map["week"]])
                if not week_num:
                    week_num = ((lesson_counter - 1) % 18) // 2 + 1

                # Soat
                hours = 1
                if col_map.get("hours") is not None and col_map["hours"] < len(cells):
                    h_val = cls._parse_int(cells[col_map["hours"]])
                    if h_val and h_val > 0:
                        hours = h_val

                # DTS talablari / O'quv maqsadlari
                dts_req = ""
                if col_map.get("objectives") is not None and col_map["objectives"] < len(cells):
                    dts_req = cells[col_map["objectives"]].strip()
                if not dts_req:
                    dts_req = cls._generate_default_objective(topic_title, lang)

                # Izoh va BSB/CHSB
                notes_text = ""
                if col_map.get("notes") is not None and col_map["notes"] < len(cells):
                    notes_text = cells[col_map["notes"]].strip()

                is_bsb, is_chsb = cls._detect_assessment_type(topic_title, notes_text)
                note_tag = "BSB" if is_bsb else ("CHSB" if is_chsb else (notes_text if notes_text else None))

                lesson_type = cls._determine_lesson_type(topic_title, is_bsb, is_chsb, lang)

                schedule.append({
                    "lesson_number": lesson_counter,
                    "quarter": current_quarter,
                    "week_number": week_num,
                    "topic_title": topic_title,
                    "hours": hours,
                    "lesson_type": lesson_type,
                    "dts_requirements": dts_req,
                    "notes": note_tag
                })
                lesson_counter += 1

        # Agar hujjatda jadval bo'lmasa, matn paragraflaridan ajratish
        if not schedule:
            schedule = cls._parse_paragraphs(doc.paragraphs, default_grade, lang)

        return cls._build_result(
            filename=filename,
            file_type="docx",
            schedule=schedule,
            default_subject_name=default_subject_name,
            grade=detected_grade,
            school_year=detected_year,
            lang=lang
        )

    @classmethod
    def _parse_xlsx(
        cls, 
        file_bytes: bytes, 
        filename: str, 
        default_subject_name: str, 
        default_grade: int,
        lang: str
    ) -> Dict[str, Any]:
        stream = io.BytesIO(file_bytes)
        wb = openpyxl.load_workbook(stream, data_only=True)

        schedule = []
        lesson_counter = 1
        current_quarter = 1

        for sheetname in wb.sheetnames:
            sheet = wb[sheetname]
            sheet_q = cls._detect_quarter_in_text(sheetname)
            if sheet_q:
                current_quarter = sheet_q

            rows = list(sheet.iter_rows(values_only=True))
            if not rows:
                continue

            col_map = None
            header_row_idx = 0

            for r_idx in range(min(10, len(rows))):
                row_vals = [str(c or "").strip() for c in rows[r_idx]]
                joined = " ".join(row_vals).lower()
                q_in_j = cls._detect_quarter_in_text(joined)
                if q_in_j:
                    current_quarter = q_in_j

                col_map = cls._map_columns(row_vals)
                if col_map.get("topic") is not None:
                    header_row_idx = r_idx
                    break

            if col_map is None or col_map.get("topic") is None:
                first_row = [str(c or "").strip() for c in rows[0]]
                col_map = cls._fallback_col_map(len(first_row))
                header_row_idx = 0

            for r_idx in range(header_row_idx + 1, len(rows)):
                row_cells = [str(c or "").strip() for c in rows[r_idx]]
                if not any(row_cells):
                    continue

                row_str = " ".join(row_cells)
                q_row = cls._detect_quarter_in_text(row_str)
                if q_row and len([x for x in row_cells if x]) <= 2:
                    current_quarter = q_row
                    continue

                topic_idx = col_map.get("topic")
                if topic_idx is None or topic_idx >= len(row_cells):
                    continue

                topic_title = row_cells[topic_idx].strip()
                if not topic_title or topic_title.lower() in cls.TOPIC_KEYWORDS:
                    continue

                # Chorak
                if col_map.get("quarter") is not None and col_map["quarter"] < len(row_cells):
                    q_val = cls._parse_int(row_cells[col_map["quarter"]])
                    if q_val and 1 <= q_val <= 4:
                        current_quarter = q_val

                # Hafta
                week_num = None
                if col_map.get("week") is not None and col_map["week"] < len(row_cells):
                    week_num = cls._parse_int(row_cells[col_map["week"]])
                if not week_num:
                    week_num = ((lesson_counter - 1) % 18) // 2 + 1

                # Soat
                hours = 1
                if col_map.get("hours") is not None and col_map["hours"] < len(row_cells):
                    h_val = cls._parse_int(row_cells[col_map["hours"]])
                    if h_val and h_val > 0:
                        hours = h_val

                # DTS talablari
                dts_req = ""
                if col_map.get("objectives") is not None and col_map["objectives"] < len(row_cells):
                    dts_req = row_cells[col_map["objectives"]].strip()
                if not dts_req:
                    dts_req = cls._generate_default_objective(topic_title, lang)

                # Izoh va BSB/CHSB
                notes_text = ""
                if col_map.get("notes") is not None and col_map["notes"] < len(row_cells):
                    notes_text = row_cells[col_map["notes"]].strip()

                is_bsb, is_chsb = cls._detect_assessment_type(topic_title, notes_text)
                note_tag = "BSB" if is_bsb else ("CHSB" if is_chsb else (notes_text if notes_text else None))

                lesson_type = cls._determine_lesson_type(topic_title, is_bsb, is_chsb, lang)

                schedule.append({
                    "lesson_number": lesson_counter,
                    "quarter": current_quarter,
                    "week_number": week_num,
                    "topic_title": topic_title,
                    "hours": hours,
                    "lesson_type": lesson_type,
                    "dts_requirements": dts_req,
                    "notes": note_tag
                })
                lesson_counter += 1

        return cls._build_result(
            filename=filename,
            file_type="xlsx",
            schedule=schedule,
            default_subject_name=default_subject_name,
            grade=default_grade,
            school_year="2024-2025",
            lang=lang
        )

    @classmethod
    def _parse_pdf(
        cls, 
        file_bytes: bytes, 
        filename: str, 
        default_subject_name: str, 
        default_grade: int,
        lang: str
    ) -> Dict[str, Any]:
        stream = io.BytesIO(file_bytes)
        reader = pypdf.PdfReader(stream)

        all_text = ""
        for page in reader.pages:
            t = page.extract_text() or ""
            all_text += t + "\n"

        lines = [line.strip() for line in all_text.split("\n") if line.strip()]

        detected_grade = cls._detect_grade(all_text[:500]) or default_grade
        detected_year = cls._detect_year(all_text[:500]) or "2024-2025"

        schedule = []
        lesson_counter = 1
        current_quarter = 1

        pattern_numbered = re.compile(r"^(\d+)[\.\)]\s*(.+?)(?:[\-\–\:\(]\s*(\d+)\s*(?:soat|soati|час|ч)|$)")

        for line in lines:
            q_det = cls._detect_quarter_in_text(line)
            if q_det and len(line) < 40:
                current_quarter = q_det
                continue

            m = pattern_numbered.match(line)
            if m:
                topic_title = m.group(2).strip()
                if len(topic_title) < 4 or topic_title.lower() in cls.TOPIC_KEYWORDS:
                    continue

                hours = int(m.group(3)) if m.group(3) else 1
                is_bsb, is_chsb = cls._detect_assessment_type(topic_title, "")
                note_tag = "BSB" if is_bsb else ("CHSB" if is_chsb else None)

                week_num = ((lesson_counter - 1) % 18) // 2 + 1
                lesson_type = cls._determine_lesson_type(topic_title, is_bsb, is_chsb, lang)
                dts_req = cls._generate_default_objective(topic_title, lang)

                schedule.append({
                    "lesson_number": lesson_counter,
                    "quarter": current_quarter,
                    "week_number": week_num,
                    "topic_title": topic_title,
                    "hours": hours,
                    "lesson_type": lesson_type,
                    "dts_requirements": dts_req,
                    "notes": note_tag
                })
                lesson_counter += 1

        return cls._build_result(
            filename=filename,
            file_type="pdf",
            schedule=schedule,
            default_subject_name=default_subject_name,
            grade=detected_grade,
            school_year=detected_year,
            lang=lang
        )

    @classmethod
    def _parse_paragraphs(cls, paragraphs, default_grade: int, lang: str) -> List[Dict[str, Any]]:
        schedule = []
        lesson_counter = 1
        current_quarter = 1

        pattern = re.compile(r"^(\d+)[\.\)]\s*(.+?)(?:[\-\–\:\(]\s*(\d+)\s*(?:soat|soati|час|ч)|$)")

        for p in paragraphs:
            text = p.text.strip()
            if not text:
                continue

            q = cls._detect_quarter_in_text(text)
            if q and len(text) < 40:
                current_quarter = q
                continue

            m = pattern.match(text)
            if m:
                topic_title = m.group(2).strip()
                if len(topic_title) < 4 or topic_title.lower() in cls.TOPIC_KEYWORDS:
                    continue
                hours = int(m.group(3)) if m.group(3) else 1
                is_bsb, is_chsb = cls._detect_assessment_type(topic_title, "")
                schedule.append({
                    "lesson_number": lesson_counter,
                    "quarter": current_quarter,
                    "week_number": ((lesson_counter - 1) % 18) // 2 + 1,
                    "topic_title": topic_title,
                    "hours": hours,
                    "lesson_type": cls._determine_lesson_type(topic_title, is_bsb, is_chsb, lang),
                    "dts_requirements": cls._generate_default_objective(topic_title, lang),
                    "notes": "BSB" if is_bsb else ("CHSB" if is_chsb else None)
                })
                lesson_counter += 1

        return schedule

    @classmethod
    def _map_columns(cls, row_cells: List[str]) -> Dict[str, Optional[int]]:
        col_map = {
            "num": None,
            "quarter": None,
            "week": None,
            "topic": None,
            "hours": None,
            "objectives": None,
            "notes": None
        }

        for idx, raw_val in enumerate(row_cells):
            val = str(raw_val or "").strip().lower()
            words = set(re.findall(r"\w+|№", val))

            # Priority 1: Topic
            if any(kw == val or kw in val for kw in cls.TOPIC_KEYWORDS):
                if col_map["topic"] is None:
                    col_map["topic"] = idx
                    continue

            # Priority 2: Quarter
            if any(kw in words or kw == val for kw in cls.QUARTER_KEYWORDS):
                if col_map["quarter"] is None:
                    col_map["quarter"] = idx
                    continue

            # Priority 3: Week
            if any(kw in words or kw == val for kw in cls.WEEK_KEYWORDS):
                if col_map["week"] is None:
                    col_map["week"] = idx
                    continue

            # Priority 4: Hours
            if any(kw in words or kw == val for kw in cls.HOURS_KEYWORDS):
                if col_map["hours"] is None:
                    col_map["hours"] = idx
                    continue

            # Priority 5: Objectives (DTS)
            if any(kw in val for kw in cls.OBJECTIVES_KEYWORDS):
                if col_map["objectives"] is None:
                    col_map["objectives"] = idx
                    continue

            # Priority 6: Notes
            if any(kw in val for kw in cls.NOTES_KEYWORDS):
                if col_map["notes"] is None:
                    col_map["notes"] = idx
                    continue

            # Priority 7: Row number
            if any(kw in words or kw == val for kw in cls.NUMBER_KEYWORDS):
                if col_map["num"] is None:
                    col_map["num"] = idx
                    continue

        return col_map

    @classmethod
    def _fallback_col_map(cls, col_count: int) -> Dict[str, Optional[int]]:
        """Standart jadvallardagi eng ko'p uchraydigan ustun tartiblari"""
        if col_count >= 6:
            return {"num": 0, "quarter": 1, "week": 2, "topic": 3, "hours": 4, "objectives": 5, "notes": 6 if col_count > 6 else None}
        elif col_count == 5:
            return {"num": 0, "quarter": None, "week": 1, "topic": 2, "hours": 3, "objectives": 4, "notes": None}
        elif col_count == 4:
            return {"num": 0, "quarter": None, "week": None, "topic": 1, "hours": 2, "objectives": 3, "notes": None}
        elif col_count == 3:
            return {"num": 0, "quarter": None, "week": None, "topic": 1, "hours": 2, "objectives": None, "notes": None}
        else:
            return {"num": None, "quarter": None, "week": None, "topic": 0, "hours": 1 if col_count > 1 else None, "objectives": None, "notes": None}

    @classmethod
    def _detect_quarter_in_text(cls, text: str) -> Optional[int]:
        t = text.lower()
        if "1-chorak" in t or "1 chorak" in t or "i chorak" in t or "1-я четверть" in t or "1 четверть" in t or "i четверть" in t:
            return 1
        if "2-chorak" in t or "2 chorak" in t or "ii chorak" in t or "2-я четверть" in t or "2 четверть" in t or "ii четверть" in t:
            return 2
        if "3-chorak" in t or "3 chorak" in t or "iii chorak" in t or "3-я четверть" in t or "3 четверть" in t or "iii четверть" in t:
            return 3
        if "4-chorak" in t or "4 chorak" in t or "iv chorak" in t or "4-я четверть" in t or "4 четверть" in t or "iv четверть" in t:
            return 4
        return None

    @classmethod
    def _detect_grade(cls, text: str) -> Optional[int]:
        m = re.search(r"(\b[1-9]|1[0-1])\s*(?:-|\s*)?(?:sinf|klass|класс|й\s*класс)", text, re.IGNORECASE)
        if m:
            return int(m.group(1))
        return None

    @classmethod
    def _detect_year(cls, text: str) -> Optional[str]:
        m = re.search(r"(202[3-9]\s*[-–/]\s*202[4-9])", text)
        if m:
            return m.group(1).replace(" ", "")
        return None

    @classmethod
    def _parse_int(cls, text: Any) -> Optional[int]:
        if isinstance(text, (int, float)):
            return int(text)
        digits = re.findall(r"\d+", str(text))
        if digits:
            return int(digits[0])
        t_clean = str(text).strip().upper()
        roman_map = {"I": 1, "II": 2, "III": 3, "IV": 4}
        if t_clean in roman_map:
            return roman_map[t_clean]
        return None

    @classmethod
    def _detect_assessment_type(cls, topic_title: str, notes: str) -> Tuple[bool, bool]:
        full = f"{topic_title} {notes}".upper()
        is_chsb = any(k in full for k in ["CHSB", "ЧСБ", "СОЧ", "YAKUNIY NAZORAT", "ИТОГОВЫЙ КОНТРОЛЬ"])
        is_bsb = any(k in full for k in ["BSB", "БСБ", "СОР", "SUMMATIV", "CHORAKLIK NAZORAT"]) and not is_chsb
        return is_bsb, is_chsb

    @classmethod
    def _determine_lesson_type(cls, topic_title: str, is_bsb: bool, is_chsb: bool, lang: str) -> str:
        is_ru = lang.lower() == "ru"
        if is_chsb:
            return "CHSB nazorati" if not is_ru else "Итоговый СОЧ"
        if is_bsb:
            return "BSB nazorati" if not is_ru else "Контроль СОР"

        t_lower = topic_title.lower()
        if any(w in t_lower for w in ["mustahkamlash", "mashq", "yechish", "amaliy", "takrorlash"]):
            return "Mustahkamlovchi mashg'ulot" if not is_ru else "Закрепление знаний"
        if any(w in t_lower for w in ["повторение", "закрепление", "решение задач", "практикум"]):
            return "Mustahkamlovchi mashg'ulot" if not is_ru else "Закрепление знаний"
        
        return "Yangi bilim beruvchi" if not is_ru else "Изучение нового материала"

    @classmethod
    def _generate_default_objective(cls, topic_title: str, lang: str) -> str:
        if lang.lower() == "ru":
            return f"Освоение понятий и формирование практических навыков по теме: {topic_title}"
        return f"{topic_title} mavzusi bo'yicha tushuncha va amaliy ko'nikmalarni to'liq egallash"

    @classmethod
    def _build_result(
        cls,
        filename: str,
        file_type: str,
        schedule: List[Dict[str, Any]],
        default_subject_name: str,
        grade: int,
        school_year: str,
        lang: str
    ) -> Dict[str, Any]:
        is_ru = lang.lower() == "ru"
        total_hours = sum(item.get("hours", 1) for item in schedule)

        quarters_summary = {1: 0, 2: 0, 3: 0, 4: 0}
        for item in schedule:
            q = item.get("quarter", 1)
            if q in quarters_summary:
                quarters_summary[q] += item.get("hours", 1)

        title = (
            f"{grade}-sinf {default_subject_name} ({filename} asosida tasdiqlangan reja)"
            if not is_ru else
            f"Календарный план для {grade}-го класса ({filename})"
        )

        return {
            "title": title,
            "filename": filename,
            "file_type": file_type,
            "is_custom_upload": True,
            "subject_name": default_subject_name,
            "grade": grade,
            "school_year": school_year,
            "total_hours": total_hours,
            "schedule": schedule,
            "quarters_summary": quarters_summary,
            "total_lessons": len(schedule)
        }
