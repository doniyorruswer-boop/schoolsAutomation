from sqlalchemy import Column, Integer, String, Text, ForeignKey, Enum as SQLEnum, DateTime, JSON, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum
from app.core.database import Base


class AssessmentType(str, enum.Enum):
    BSB = "BSB"    # Baho Summativ Baholash
    CHSB = "CHSB"  # Choraklik Summativ Baholash


class AssessmentStatus(str, enum.Enum):
    DRAFT = "DRAFT"          # Qoralama (Suv belgisi: "TASDIQLANMAGAN")
    APPROVED = "APPROVED"    # O'qituvchi tomonidan tasdiqlangan (Chop etish mumkin)


class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, index=True)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    title = Column(String(255), nullable=False)
    assessment_type = Column(SQLEnum(AssessmentType), default=AssessmentType.BSB, nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    grade = Column(Integer, nullable=False)
    quarter = Column(Integer, nullable=False)
    
    # 1-nazorat: Tanlangan mavzular ro'yxati (IDs)
    topic_ids = Column(JSON, nullable=False)
    
    total_max_score = Column(Integer, default=25, nullable=False) # Masalan: 25 yoki 40 yoki 100 ball
    variants_count = Column(Integer, default=2, nullable=False) # 2 ta yoki 4 ta variant
    status = Column(SQLEnum(AssessmentStatus), default=AssessmentStatus.DRAFT, nullable=False)
    
    # AI tomonidan yaratilgan strukturalangan variantlar va rubrikalar (JSON)
    # { "variants": [ { "variant_number": 1, "questions": [ ... ] } ] }
    content = Column(JSON, nullable=False)
    
    # Validator tekshiruvi natijalari
    validation_report = Column(JSON, nullable=True) # { "is_valid": true, "total_score_match": true, ... }
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    author = relationship("User", back_populates="assessments")


class Question(Base):
    """Tasdiqlangan Savollar Banki modeli"""
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=False)
    grade = Column(Integer, nullable=False)
    difficulty = Column(String(20), default="MEDIUM") # EASY, MEDIUM, HARD
    question_text = Column(Text, nullable=False)
    correct_answer = Column(Text, nullable=False)
    max_score = Column(Integer, default=5, nullable=False)
    descriptors = Column(JSON, nullable=False) # Baholash mezonlari ketma-ketligi
    
    is_approved = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    topic = relationship("Topic", back_populates="questions")
