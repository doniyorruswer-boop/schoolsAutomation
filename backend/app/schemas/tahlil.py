from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class StudentScore(BaseModel):
    student_number: int  # Shaxsiy ma'lumot emas, shunchaki tartib raqam: 1, 2, 3...
    score: float
    grade_mark: int      # 5, 4, 3, 2 baho


class TahlilStatistics(BaseModel):
    total_students: int
    participated_students: int
    absent_students: int
    average_score: float
    mastery_percentage: float  # O'zlashtirish foizi (%)
    quality_percentage: float  # Sifat ko'rsatkichi (%)
    count_5: int
    count_4: int
    count_3: int
    count_2: int
    highest_score: float
    lowest_score: float


class TahlilSummaryResponse(BaseModel):
    subject_name: str
    class_name: str
    assessment_title: str
    statistics: TahlilStatistics
    recommendations: str
    problematic_areas: List[str] = []
