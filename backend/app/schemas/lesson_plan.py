from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Any, Dict
from datetime import datetime


class KTPRowItem(BaseModel):
    lesson_number: int
    quarter: int
    week_number: int
    topic_title: str
    hours: int = 1
    lesson_type: str = "Yangi bilim beruvchi"
    dts_requirements: str
    notes: Optional[str] = None


class KTPContent(BaseModel):
    subject_name: str
    grade: int
    school_year: str = "2024-2025"
    period: str = "annual"
    hours_per_week: int = 2
    total_hours: int = 68
    school_name: Optional[str] = "Umumta'lim maktabi"
    teacher_name: Optional[str] = "O'qituvchi"
    schedule: List[KTPRowItem]


class KonspektStage(BaseModel):
    stage_number: str
    title: str
    time_minutes: int
    teacher_activity: str
    student_activity: str
    content: str


class KonspektContent(BaseModel):
    subject_name: str
    grade: int
    topic_title: str
    lesson_type: str
    lesson_methods: str
    lesson_equipment: str
    educational_goal: str
    developmental_goal: str
    upbringing_goal: str
    competencies: str
    stages: List[KonspektStage]
    homework: str


class KTPGenerateRequest(BaseModel):
    subject_id: int
    grade: int
    period: str = "annual"  # "annual", "quarter_1", "quarter_2", "quarter_3", "quarter_4"
    hours_per_week: int = Field(default=2, ge=1, le=6)
    school_year: Optional[str] = "2024-2025"
    include_bsb_chsb: bool = True
    lang: str = "uz"


class KonspektGenerateRequest(BaseModel):
    subject_id: int
    grade: int
    quarter: int = 1
    topic_title: str
    lesson_type: Optional[str] = "Yangi bilim beruvchi dars"
    methods: Optional[str] = "Aqliy hujum, savol-javob, amaliy mashqlar"
    lang: str = "uz"


class LessonPlanResponse(BaseModel):
    id: int
    author_id: int
    plan_type: str
    title: str
    subject_id: int
    grade: int
    quarter: int
    hours_per_week: Optional[int] = 2
    total_hours: Optional[int] = 68
    topic_title: Optional[str] = None
    content: Dict[str, Any]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
