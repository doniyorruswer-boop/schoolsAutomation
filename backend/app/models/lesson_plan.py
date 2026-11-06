from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base


class LessonPlan(Base):
    """
    Taqvim-Mavzu Reja (KTP) va Dars Ishlanmasi (Kundalik Konspekt) modeli
    """
    __tablename__ = "lesson_plans"

    id = Column(Integer, primary_key=True, index=True)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    plan_type = Column(String(50), nullable=False)  # 'KTP' yoki 'KONSPEKT'
    title = Column(String(255), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    grade = Column(Integer, nullable=False)
    quarter = Column(Integer, default=1, nullable=False)  # 1, 2, 3, 4 yoki 0 (yillik)
    
    # KTP uchun maxsus maydonlar
    hours_per_week = Column(Integer, default=2)
    total_hours = Column(Integer, default=68)
    
    # Konspekt uchun mavzu nomi
    topic_title = Column(String(255), nullable=True)
    
    # Reja / Konspektning to'liq JSON ma'lumotlari
    content = Column(JSON, nullable=False)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    author = relationship("User", backref="lesson_plans")
    subject = relationship("Subject")
