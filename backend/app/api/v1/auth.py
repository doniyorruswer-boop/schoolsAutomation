import re
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import create_access_token
from app.models.user import User
from app.models.license import LicenseKey, LicenseStatus
from app.schemas.user import (
    UserResponse, TelegramAuthRequest, TokenResponse,
    PhoneAuthRequest, GuestSessionRequest, ProfileUpdateRequest
)
from app.api.v1.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Autentifikatsiya va Shaxsiy Kabinet"])


def _build_user_response(user: User, db: Session) -> UserResponse:
    active_lic = db.query(LicenseKey).filter(
        LicenseKey.user_id == user.id,
        LicenseKey.status == LicenseStatus.ACTIVE
    ).first()
    return UserResponse(
        id=user.id,
        full_name=user.full_name,
        phone_number=user.phone_number,
        school_name=user.school_name,
        telegram_id=user.telegram_id,
        is_admin=user.is_admin,
        is_active=user.is_active,
        trial_assessments_used=user.trial_assessments_used,
        has_active_license=active_lic is not None,
        license_expires_at=active_lic.expires_at if active_lic else None
    )


@router.post("/phone-login", response_model=TokenResponse)
def phone_login(payload: PhoneAuthRequest, db: Session = Depends(get_db)):
    """
    Telefon raqami orqali shaxsiy hisobga kirish yoki ro'yxatdan o'tish.
    Har bir obunachining ish maydoni va hujjatlari alohida saqlanadi.
    """
    clean_phone = re.sub(r'[\s\-\(\)]', '', payload.phone_number.strip())
    if len(clean_phone) < 7:
        raise HTTPException(status_code=400, detail="Telefon raqami noto'g'ri kiritildi.")

    user = db.query(User).filter(User.phone_number == clean_phone).first()

    if not user:
        # Yangi obunachi yaratish
        user = User(
            full_name=payload.full_name or f"O'qituvchi ({clean_phone[-4:]})",
            phone_number=clean_phone,
            school_name=payload.school_name or "Umumta'lim maktabi",
            trial_assessments_used=0
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token({"sub": str(user.id), "name": user.full_name})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": _build_user_response(user, db)
    }


@router.post("/guest-session", response_model=TokenResponse)
def guest_session(payload: GuestSessionRequest, db: Session = Depends(get_db)):
    """
    Har bir brauzer / qurilma uchun xavfsiz va mustaqil shaxsiy ishchi muhit (workspace).
    Bir foydalanuvchining ishlari ikkinchisiga mutlaqo aralashmaydi.
    """
    device_id = payload.device_id.strip()
    if not device_id:
        raise HTTPException(status_code=400, detail="Device ID ko'rsatilmadi.")

    device_key = f"dev_{device_id[:64]}"
    user = db.query(User).filter(User.telegram_id == device_key).first()

    if not user:
        user = User(
            telegram_id=device_key,
            full_name=payload.full_name or "O'qituvchi",
            school_name=payload.school_name or "Umumta'lim maktabi",
            trial_assessments_used=0
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token({"sub": str(user.id), "name": user.full_name})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": _build_user_response(user, db)
    }


@router.post("/telegram-login", response_model=TokenResponse)
def telegram_login(payload: TelegramAuthRequest, db: Session = Depends(get_db)):
    """Telegram WebApp yoki bot orqali kirish"""
    user = db.query(User).filter(User.telegram_id == payload.telegram_id).first()
    
    if not user:
        user = User(
            telegram_id=payload.telegram_id,
            full_name=payload.full_name,
            school_name=payload.school_name or "Umumta'lim maktabi",
            trial_assessments_used=0
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token({"sub": str(user.id), "name": user.full_name})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": _build_user_response(user, db)
    }


@router.put("/profile", response_model=UserResponse)
def update_profile(
    payload: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """O'qituvchi o'z ism-familiyasi va maktabini o'zgartirishi"""
    if payload.full_name:
        current_user.full_name = payload.full_name.strip()
    if payload.phone_number:
        clean_phone = re.sub(r'[\s\-\(\)]', '', payload.phone_number.strip())
        current_user.phone_number = clean_phone
    if payload.school_name:
        current_user.school_name = payload.school_name.strip()

    db.commit()
    db.refresh(current_user)
    return _build_user_response(current_user, db)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Joriy foydalanuvchi ma'lumotlari"""
    return _build_user_response(current_user, db)
