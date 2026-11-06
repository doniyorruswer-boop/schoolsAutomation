import io
import openpyxl
from typing import Dict, Any, List
from fastapi import HTTPException, status
from app.schemas.tahlil import TahlilStatistics, TahlilSummaryResponse


class ExcelTahlilService:
    """
    e-Maktabdan yuklab olingan Excel fayllarni tahlil qilish xizmati.
    Shaxsiy ma'lumotlar bazada saqlanmaydi, faqat kod hisob-kitob qiladi!
    """

    @staticmethod
    def process_emaktab_excel(
        file_bytes: bytes,
        subject_name: str,
        class_name: str,
        assessment_title: str,
        max_possible_score: float = 100.0
    ) -> TahlilSummaryResponse:
        try:
            wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
            sheet = wb.active
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Excel faylini ochishda xatolik yuz berdi: {str(e)}"
            )

        scores: List[float] = []
        
        # 1. Ustunlar bo'yicha tahlil qilish (Column-based analysis)
        # Odatda 1-ustun tartib raqam (1, 2, 3...), 2-ustun Ism, 3-ustun Baho/Ball bo'ladi
        cols = list(sheet.iter_cols(values_only=True))
        best_col_scores = []
        
        for col_idx, col in enumerate(cols):
            candidate_numbers = []
            for cell_idx, val in enumerate(col):
                if cell_idx == 0:  # Header row
                    continue
                if isinstance(val, (int, float)) and 0 <= val <= max_possible_score:
                    candidate_numbers.append(float(val))
                    
            if candidate_numbers:
                # Agar bu ustun shunchaki 1, 2, 3, 4, 5... ketma-ket tartib raqam bo'lsa (va 1 dan boshlansa),
                # bu baho ustuni emas, tartib raqam ustunidir!
                is_sequential_index = (
                    len(candidate_numbers) > 2 and
                    candidate_numbers[0] == 1.0 and
                    candidate_numbers[1] == 2.0 and
                    candidate_numbers[2] == 3.0
                )
                if not is_sequential_index:
                    best_col_scores = candidate_numbers
                    break  # Haqiqiy ball ustuni topildi!
                    
        if best_col_scores:
            scores = best_col_scores

        if not scores:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Excel faylida o'quvchilar ballari topilmadi. Ustunlar to'g'ri to'ldirilganini tekshiring."
            )

        total_students = len(scores)
        participated_students = len([s for s in scores if s > 0])
        absent_students = total_students - participated_students
        
        # O'zbekiston baholash shkalasi (foizlarda):
        # 86% - 100% -> "5" (A'lo)
        # 71% - 85%  -> "4" (Yaxshi)
        # 56% - 70%  -> "3" (Qoniqarli)
        # 0%  - 55%  -> "2" (Qoniqarsiz)
        
        count_5 = 0
        count_4 = 0
        count_3 = 0
        count_2 = 0
        
        for sc in scores:
            pct = (sc / max_possible_score) * 100
            if pct >= 86:
                count_5 += 1
            elif pct >= 71:
                count_4 += 1
            elif pct >= 56:
                count_3 += 1
            else:
                count_2 += 1

        avg_score = sum(scores) / total_students if total_students > 0 else 0.0
        
        # O'zlashtirish foizi = (5 + 4 + 3 olganlar) / jami qatnashganlar * 100
        mastery_pct = ((count_5 + count_4 + count_3) / participated_students * 100) if participated_students > 0 else 0.0
        # Sifat ko'rsatkichi = (5 + 4 olganlar) / jami qatnashganlar * 100
        quality_pct = ((count_5 + count_4) / participated_students * 100) if participated_students > 0 else 0.0

        stats = TahlilStatistics(
            total_students=total_students,
            participated_students=participated_students,
            absent_students=absent_students,
            average_score=round(avg_score, 1),
            mastery_percentage=round(mastery_pct, 1),
            quality_percentage=round(quality_pct, 1),
            count_5=count_5,
            count_4=count_4,
            count_3=count_3,
            count_2=count_2,
            highest_score=max(scores),
            lowest_score=min(scores)
        )

        # Standart xulosa va tavsiya matnini avtomatlashtirish
        recommendations = (
            f"{class_name}-sinfda {subject_name} fanidan o'tkazilgan {assessment_title} natijalariga ko'ra, "
            f"o'zlashtirish ko'rsatkichi {stats.mastery_percentage}% ni, sifat ko'rsatkichi esa {stats.quality_percentage}% ni tashkil etdi. "
            f"Qoniqarsiz baho olgan {count_2} nafar o'quvchi bilan mavzular bo'yicha individual korreksion mashg'ulotlar o'tkazish, "
            f"a'lo baho olgan {count_5} nafar o'quvchi bilan esa murakkablik darajasi yuqori bo'lgan mantiqiy masalalar ustida ishlash tavsiya etiladi."
        )

        problematic_areas = []
        if count_2 > 0:
            problematic_areas.append(f"{count_2} nafar o'quvchi 55% dan past natija ko'rsatdi (bo'shliqlar mavjud)")
        if stats.quality_percentage < 50:
            problematic_areas.append("Sifat ko'rsatkichi 50% dan past. Amaliy topshiriqlarni ko'paytirish zarur.")

        return TahlilSummaryResponse(
            subject_name=subject_name,
            class_name=class_name,
            assessment_title=assessment_title,
            statistics=stats,
            recommendations=recommendations,
            problematic_areas=problematic_areas
        )
