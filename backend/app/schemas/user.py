from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    full_name: str
    phone_number: Optional[str] = None
    school_name: Optional[str] = None


class UserCreate(UserBase):
    telegram_id: Optional[str] = None


class UserResponse(UserBase):
    id: int
    telegram_id: Optional[str] = None
    is_admin: bool = False
    is_active: bool = True
    trial_assessments_used: int = 0
    has_active_license: bool = False
    license_expires_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class TelegramAuthRequest(BaseModel):
    telegram_id: str
    full_name: str
    username: Optional[str] = None
    school_name: Optional[str] = None


class PhoneAuthRequest(BaseModel):
    phone_number: str
    full_name: Optional[str] = None
    school_name: Optional[str] = None


class GuestSessionRequest(BaseModel):
    device_id: str
    full_name: Optional[str] = None
    school_name: Optional[str] = None


class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    school_name: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
