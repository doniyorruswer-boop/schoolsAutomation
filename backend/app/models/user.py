from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    telegram_id = Column(String, unique=True, index=True, nullable=True)
    full_name = Column(String, nullable=False)
    phone_number = Column(String, nullable=True)
    school_name = Column(String, nullable=True)
    is_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    
    # Bepul sinov limiti hisoblagichi
    trial_assessments_used = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Bog'lanishlar
    licenses = relationship("LicenseKey", back_populates="user", cascade="all, delete-orphan")
    assessments = relationship("Assessment", back_populates="author", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user")
