from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum
from app.core.database import Base


class PlanType(str, enum.Enum):
    TRIAL = "TRIAL"
    STANDARD = "STANDARD"  # Faqat BSB va tahlil
    PRO = "PRO"            # Barcha 4 ta modul


class LicenseStatus(str, enum.Enum):
    UNUSED = "UNUSED"
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"
    REVOKED = "REVOKED"


class LicenseKey(Base):
    __tablename__ = "license_keys"

    id = Column(Integer, primary_key=True, index=True)
    key_code = Column(String(32), unique=True, index=True, nullable=False)
    plan_type = Column(SQLEnum(PlanType), default=PlanType.STANDARD, nullable=False)
    duration_days = Column(Integer, default=30)
    status = Column(SQLEnum(LicenseStatus), default=LicenseStatus.UNUSED, nullable=False)
    
    # Kim tomonidan faollashtirildi
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    activated_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    
    notes = Column(String, nullable=True) # Masalan: "10-maktab Matematika o'qituvchisi"
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="licenses")
