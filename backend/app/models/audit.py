from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base


class AuditLog(Base):
    """Nazorat va audit jurnali (kim, qachon, nima yaratdi va o'zgartirdi)"""
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False) # Masalan: "CREATE_BSB", "APPROVE_BSB", "EXPORT_WORD", "ACTIVATE_LICENSE"
    entity_type = Column(String(50), nullable=True) # "Assessment", "LicenseKey", "ExcelTahlil"
    entity_id = Column(Integer, nullable=True)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="audit_logs")
