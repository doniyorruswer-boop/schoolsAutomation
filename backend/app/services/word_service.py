import io
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn
from typing import Dict, Any
from app.models.assessment import AssessmentStatus
from app.schemas.tahlil import TahlilSummaryResponse


class WordDocumentService:
    """
    O'zbekiston maktab ta'limi rasmiy standartiga mos Word (.docx) hujjatlar generatori.
    """

    @classmethod
    def generate_bsb_document(cls, assessment_title: str, subject_name: str, grade: int, content: Dict[str, Any], status: AssessmentStatus) -> io.BytesIO:
        doc = Document()
        
        # Rus tili ekanligini aniqlash (kirill harflari tekshiruvi)
        is_ru = any('\u0400' <= char <= '\u04FF' for char in assessment_title + subject_name)

        # Sahifa hoshiyalari (margins)
        for section in doc.sections:
            section.top_margin = Inches(0.8)
            section.bottom_margin = Inches(0.8)
            section.left_margin = Inches(0.8)
            section.right_margin = Inches(0.8)

        # Agar qoralama bo'lsa, ogohlantirish belgisi
        if status == AssessmentStatus.DRAFT:
            p_draft = doc.add_paragraph()
            p_draft.alignment = WD_ALIGN_PARAGRAPH.CENTER
            draft_txt = "--- ЧЕРНОВИК (НЕ УТВЕРЖДЕНО) ---" if is_ru else "--- QORALAMA (TASDIQLANMAGAN) ---"
            run_draft = p_draft.add_run(draft_txt)
            run_draft.bold = True
            run_draft.font.size = Pt(13)
            run_draft.font.color.rgb = RGBColor(220, 38, 38) # Qizil rang

        # Sarlavha
        title_p = doc.add_paragraph()
        title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        ministry_txt = (
            "МИНИСТЕРСТВО ДОШКОЛЬНОГО И ШКОЛЬНОГО ОБРАЗОВАНИЯ РЕСПУБЛИКИ УЗБЕКИСТАН\n" 
            if is_ru else 
            "O'ZBEKISTON RESPUBLIKASI MAKTABGACHA VA MAKTAB TA'LIMI VAZIRLIGI\n"
        )
        r1 = title_p.add_run(ministry_txt)
        r1.font.size = Pt(10)
        r1.bold = True
        
        subj_header = (
            f"ПО ПРЕДМЕТУ: {subject_name.upper()} ДЛЯ {grade}-ГО КЛАССА\n{assessment_title.upper()}"
            if is_ru else
            f"{subject_name.upper()} FANIDAN {grade}-SINF UCHUN\n{assessment_title.upper()}"
        )
        r2 = title_p.add_run(subj_header)
        r2.font.size = Pt(12)
        r2.bold = True

        default_inst = "Внимательно прочитайте задания и запишите полное решение." if is_ru else "Topshiriqlarni diqqat bilan o'qing va javoblarini to'liq yozing."
        instruction = content.get("instruction", default_inst)
        p_inst = doc.add_paragraph()
        inst_label = "Инструкция: " if is_ru else "Eslatma va ko'rsatma: "
        p_inst.add_run(inst_label).bold = True
        p_inst.add_run(instruction).italic = True

        if content.get("textbook_pages"):
            pages_p = doc.add_paragraph()
            pages_p.paragraph_format.space_after = Pt(4)
            pages_label = "Учебник (страницы): " if is_ru else "Darslik sahifalari: "
            pages_p.add_run(pages_label).bold = True
            pages_p.add_run(content["textbook_pages"]).italic = True

        variants = content.get("variants", [])
        for v in variants:
            v_title = v.get("title", f"{v.get('variant_number', 1)}-variant")
            total_pts = v.get("total_score", 0)

            # Variant sarlavhasi
            vp = doc.add_paragraph()
            vp.alignment = WD_ALIGN_PARAGRAPH.LEFT
            v_pts_txt = f"(Всего: {total_pts} баллов)" if is_ru else f"(Jami ball: {total_pts} ball)"
            v_run = vp.add_run(f"\n{v_title.upper()} {v_pts_txt}")
            v_run.bold = True
            v_run.font.size = Pt(11)
            v_run.font.color.rgb = RGBColor(30, 64, 175) # Ko'k rang

            # Savollar
            questions = v.get("questions", [])
            for q in questions:
                qp = doc.add_paragraph()
                qp.paragraph_format.left_indent = Inches(0.2)
                q_lbl = f"Задание {q.get('number', 1)} ({q.get('max_score', 0)} баллов): " if is_ru else f"{q.get('number', 1)}-savol ({q.get('max_score', 0)} ball): "
                q_num_run = qp.add_run(q_lbl)
                q_num_run.bold = True
                qp.add_run(f"{q.get('text', '')}\n")

                # Deskriptorlar jadvali
                descriptors = q.get("descriptors", [])
                if descriptors:
                    table = doc.add_table(rows=1, cols=3)
                    table.alignment = WD_TABLE_ALIGNMENT.CENTER
                    table.style = 'Table Grid'
                    
                    hdr_cells = table.rows[0].cells
                    hdr_cells[0].text = "№"
                    hdr_cells[1].text = "Критерий оценивания (Дескриптор)" if is_ru else "Baholash mezoni (Deskriptor)"
                    hdr_cells[2].text = "Балл" if is_ru else "Ball"
                    
                    for cell in hdr_cells:
                        shading_elm = parse_xml(r'<w:shd {} w:fill="E2E8F0"/>'.format(nsdecls('w')))
                        cell._tc.get_or_add_tcPr().append(shading_elm)
                        cell.paragraphs[0].runs[0].bold = True

                    for d in descriptors:
                        row_cells = table.add_row().cells
                        row_cells[0].text = str(d.get("step_number", ""))
                        row_cells[1].text = d.get("description", "")
                        row_cells[2].text = str(d.get("points", ""))

            doc.add_page_break()

        file_stream = io.BytesIO()
        doc.save(file_stream)
        file_stream.seek(0)
        return file_stream

    @classmethod
    def generate_tahlil_bayonnomasi_doc(cls, tahlil: TahlilSummaryResponse, school_name: str, teacher_name: str) -> io.BytesIO:
        doc = Document()
        is_ru = any('\u0400' <= char <= '\u04FF' for char in tahlil.subject_name + tahlil.assessment_title)
        
        # Sahifa sozlamalari
        for section in doc.sections:
            section.top_margin = Inches(0.8)
            section.bottom_margin = Inches(0.8)
            section.left_margin = Inches(0.8)
            section.right_margin = Inches(0.8)

        # Sarlavha
        tp = doc.add_paragraph()
        tp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        tr1 = tp.add_run(f"{school_name.upper()}\n")
        tr1.font.size = Pt(11)
        tr1.bold = True
        
        doc_header = (
            "ПРОТОКОЛ МЕТОДИЧЕСКОГО ОБЪЕДИНЕНИЯ УЧИТЕЛЕЙ ПРЕДМЕТА\n\n"
            if is_ru else
            "FAN O'QITUVCHILARI METODIK BIRLASHMASI BAYONNOMASI\n\n"
        )
        tr2 = tp.add_run(doc_header)
        tr2.font.size = Pt(12)
        tr2.bold = True

        # Kirish ma'lumotlari
        ip = doc.add_paragraph()
        ip.add_run("Предмет: " if is_ru else "Fan: ").bold = True
        ip.add_run(f"{tahlil.subject_name}\t\t")
        ip.add_run("Класс: " if is_ru else "Sinf: ").bold = True
        ip.add_run(f"{tahlil.class_name}\n")
        ip.add_run("Оценивание: " if is_ru else "O'tkazilgan baholash: ").bold = True
        ip.add_run(f"{tahlil.assessment_title}\n")
        ip.add_run("Учитель: " if is_ru else "Fan o'qituvchisi: ").bold = True
        ip.add_run(f"{teacher_name}\n")

        # Natijalar jadvali
        table_title = "РЕЗУЛЬТАТЫ ОЦЕНИВАНИЯ И СТАТИСТИКА:" if is_ru else "BAHOLASH NATIJALARI VA STATISTIKA:"
        doc.add_paragraph(table_title).runs[0].bold = True
        
        st = tahlil.statistics
        table = doc.add_table(rows=8, cols=2)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        table.style = 'Table Grid'

        if is_ru:
            rows_data = [
                ("Всего учащихся", f"{st.total_students} чел."),
                ("Приняли участие в оценивании", f"{st.participated_students} чел."),
                ("Отлично (86 - 100%) [Оценка 5]", f"{st.count_5} чел."),
                ("Хорошо (71 - 85%) [Оценка 4]", f"{st.count_4} чел."),
                ("Удовлетворительно (56 - 70%) [Оценка 3]", f"{st.count_3} чел."),
                ("Неудовлетворительно (0 - 55%) [Оценка 2]", f"{st.count_2} чел."),
                ("ПОКАЗАТЕЛЬ УСВОЕНИЯ", f"{st.mastery_percentage}%"),
                ("ПОКАЗАТЕЛЬ КАЧЕСТВА", f"{st.quality_percentage}%")
            ]
        else:
            rows_data = [
                ("Jami o'quvchilar soni", f"{st.total_students} nafar"),
                ("Baholashda qatnashganlar", f"{st.participated_students} nafar"),
                ("A'lo baho (86 - 100%) [5 baho]", f"{st.count_5} nafar"),
                ("Yaxshi baho (71 - 85%) [4 baho]", f"{st.count_4} nafar"),
                ("Qoniqarli baho (56 - 70%) [3 baho]", f"{st.count_3} nafar"),
                ("Qoniqarsiz baho (0 - 55%) [2 baho]", f"{st.count_2} nafar"),
                ("O'ZLASHTIRISH KO'RSATKICHI", f"{st.mastery_percentage}%"),
                ("SIFAT KO'RSATKICHI", f"{st.quality_percentage}%")
            ]

        for i, (label, val) in enumerate(rows_data):
            row_cells = table.rows[i].cells
            row_cells[0].text = label
            row_cells[1].text = val
            if i >= 6: # Asosiy foizlarni ajratib ko'rsatish
                row_cells[0].paragraphs[0].runs[0].bold = True
                row_cells[1].paragraphs[0].runs[0].bold = True
                shd1 = parse_xml(r'<w:shd {} w:fill="FEF08A"/>'.format(nsdecls('w')))
                shd2 = parse_xml(r'<w:shd {} w:fill="FEF08A"/>'.format(nsdecls('w')))
                row_cells[0]._tc.get_or_add_tcPr().append(shd1)
                row_cells[1]._tc.get_or_add_tcPr().append(shd2)

        # Xulosa va Tavsiyalar
        rec_title = "\nЗАКЛЮЧЕНИЕ И МЕРЫ ПО УСТРАНЕНИЮ ПРОБЕЛОВ:" if is_ru else "\nXULOSA VA BARTARAF ETISH CHORALARI:"
        doc.add_paragraph(rec_title).runs[0].bold = True
        rec_p = doc.add_paragraph(tahlil.recommendations)
        rec_p.paragraph_format.left_indent = Inches(0.2)

        if tahlil.problematic_areas:
            prob_title = "Выявленные проблемы:" if is_ru else "Aniqlangan muammolar:"
            doc.add_paragraph(prob_title).runs[0].bold = True
            for area in tahlil.problematic_areas:
                doc.add_paragraph(f"• {area}", style='List Bullet')

        # Imzolar
        doc.add_paragraph("\n\n")
        sign_p = doc.add_paragraph()
        sign_teacher = f"Учитель предмета:  ________________ / {teacher_name}\n\n" if is_ru else f"Fan o'qituvchisi:  ________________ / {teacher_name}\n\n"
        sign_lead = "Руководитель методического объединения:  ________________ / ________________" if is_ru else "Metod birlashma rahbari:  ________________ / ________________"
        sign_p.add_run(sign_teacher)
        sign_p.add_run(sign_lead)

        file_stream = io.BytesIO()
        doc.save(file_stream)
        file_stream.seek(0)
        return file_stream
