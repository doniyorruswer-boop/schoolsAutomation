from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Any, Dict
from datetime import datetime
from app.models.assessment import AssessmentType, AssessmentStatus


class DescriptorItem(BaseModel):
    step_number: int
    description: str = Field(..., description="Mezon tavsifi, masalan: Qisqa ko'paytirish formulasini to'g'ri qo'llay oladi")
    points: int = Field(..., ge=1, description="Ushbu qadam uchun ball")


class QuestionItem(BaseModel):
    number: int
    text: str
    difficulty: str = "MEDIUM"  # EASY, MEDIUM, HARD
    max_score: int
    correct_answer: str
    descriptors: List[DescriptorItem]


class VariantItem(BaseModel):
    variant_number: int
    title: str = "1-variant"
    questions: List[QuestionItem]
    total_score: int


class AssessmentContent(BaseModel):
    instruction: Optional[str] = "Har bir topshiriqni diqqat bilan o'qing va javobingizni to'liq bayon qiling."
    variants: List[VariantItem]


class BSBCreateRequest(BaseModel):
    title: str = Field(..., description="Masalan: 1-BSB. Algebra 7-sinf")
    assessment_type: AssessmentType = AssessmentType.BSB
    subject_id: int
    grade: int = Field(..., ge=1, le=11)
    quarter: int = Field(..., ge=1, le=4)
    topic_ids: Optional[List[int]] = Field(default_factory=list, description="Katalogdan tanlangan mavzular ID lari")
    manual_topics: Optional[List[str]] = Field(default_factory=list, description="Qo'lda kiritilgan mavzular ro'yxati (matn shaklida)")
    total_max_score: int = Field(default=25, ge=10, le=100)
    variants_count: int = Field(default=2, ge=1, le=4)
    question_count: Optional[int] = Field(default=5, ge=1, le=20, description="Savollar soni (har bir variantda)")
    textbook_pages: Optional[str] = Field(default=None, description="Darslik sahifalari cheklovi, masalan: '45-78-betlar'")
    custom_instructions: Optional[str] = None
    lang: str = Field(default="uz", description="Til: 'uz' yoki 'ru'")


class QuestionSwapRequest(BaseModel):
    variant_number: int = Field(default=1, ge=1, le=4, description="Variant raqami (1, 2, ...)")
    question_number: int = Field(default=1, ge=1, le=20, description="Almashtiriladigan savol raqami")
    preferred_difficulty: Optional[str] = Field(default=None, description="EASY, MEDIUM, HARD")
    custom_hint: Optional[str] = Field(default=None, description="O'qituvchi maxsus talabi yoki ko'rsatmasi")
    lang: str = Field(default="uz", description="Til: 'uz' yoki 'ru'")


class BSBUpdateRequest(BaseModel):
    title: Optional[str] = None
    content: Optional[AssessmentContent] = None
    status: Optional[AssessmentStatus] = None


class AssessmentResponse(BaseModel):
    id: int
    author_id: int
    title: str
    assessment_type: AssessmentType
    subject_id: int
    grade: int
    quarter: int
    topic_ids: List[int]
    total_max_score: int
    variants_count: int
    status: AssessmentStatus
    content: Dict[str, Any]
    validation_report: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
