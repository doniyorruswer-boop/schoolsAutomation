from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from app.models.license import PlanType, LicenseStatus


class LicenseActivateRequest(BaseModel):
    key_code: str = Field(..., description="Faollashtirish kodi, masalan: EDU-8F2A-99B1-2026")


class LicenseGenerateRequest(BaseModel):
    count: int = Field(default=1, ge=1, le=100)
    duration_days: int = Field(default=30, ge=1, le=365)
    plan_type: PlanType = PlanType.STANDARD
    notes: Optional[str] = None


class LicenseResponse(BaseModel):
    id: int
    key_code: str
    plan_type: PlanType
    duration_days: int
    status: LicenseStatus
    activated_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class LicenseStatusResponse(BaseModel):
    is_active: bool
    plan_type: Optional[PlanType] = None
    expires_at: Optional[datetime] = None
    days_left: Optional[int] = None
    trial_assessments_left: int = 0
