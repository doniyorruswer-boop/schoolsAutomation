from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False) # Masalan: "Algebra", "Ona tili"
    code = Column(String(50), unique=True, index=True) # "algebra", "ona_tili"

    topics = relationship("Topic", back_populates="subject", cascade="all, delete-orphan")


class Topic(Base):
    __tablename__ = "topics"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    grade = Column(Integer, nullable=False) # Sinf raqami: 7, 8, 9, ...
    quarter = Column(Integer, nullable=False) # Chorak: 1, 2, 3, 4
    chapter = Column(String(150), nullable=True) # Bob / Bo'lim nomi
    title = Column(String(255), nullable=False) # Mavzu nomi
    learning_objectives = Column(Text, nullable=True) # DTS bo'yicha talablar / ko'nikmalar
    author_id = Column(Integer, ForeignKey("users.id"), nullable=True) # NULL = Rasmiy DTS, Integer = Shaxsiy mavzu

    subject = relationship("Subject", back_populates="topics")
    questions = relationship("Question", back_populates="topic")
