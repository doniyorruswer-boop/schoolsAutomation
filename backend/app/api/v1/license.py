from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone
from app.core.database import get_db
from app.models.user import User
from app.models.license import LicenseKey, LicenseStatus
from app.schemas.license import (
    LicenseActivateRequest, 
    LicenseResponse, 
    LicenseStatusResponse, 
    LicenseGenerateRequest
)
from app.api.v1.dependencies import get_current_user, require_admin
from app.services.license_service import activate_user_license, create_license_keys
from app.core.config import settings

router = APIRouter(prefix="/license", tags=["Litsenziya va Faollashtirish"])


@router.post("/activate", response_model=LicenseResponse)
def activate_license(
    payload: LicenseActivateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    O'qituvchi sotib olingan faollashtirish kodini kiritadi.
    Kod bir martalik bo'lib, o'qituvchi akkauntiga bog'lanadi.
    """
    activated = activate_user_license(db, current_user, payload.key_code)
    return activated


@router.get("/status", response_model=LicenseStatusResponse)
def get_license_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Joriy litsenziya holati va qolgan kunlar soni"""
    now = datetime.now(timezone.utc)
    active_license = db.query(LicenseKey).filter(
        LicenseKey.user_id == current_user.id,
        LicenseKey.status == LicenseStatus.ACTIVE
    ).first()

    if active_license and active_license.expires_at:
        exp_at = active_license.expires_at
        if exp_at.tzinfo is None:
            exp_at = exp_at.replace(tzinfo=timezone.utc)
            
        if exp_at > now:
            days_left = (exp_at - now).days
            return LicenseStatusResponse(
                is_active=True,
                plan_type=active_license.plan_type,
                expires_at=active_license.expires_at,
                days_left=days_left,
                trial_assessments_left=0
            )

    trial_left = max(0, settings.TRIAL_ASSESSMENTS_ALLOWED - current_user.trial_assessments_used)
    return LicenseStatusResponse(
        is_active=False,
        plan_type=None,
        expires_at=None,
        days_left=0,
        trial_assessments_left=trial_left
    )


@router.post("/reset-test")
def reset_license_for_testing(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    TEST REJIMI UCHUN: Foydalanuvchining litsenziyasini tozalaydi,
    shunda litsenziyasiz yoki yangi kod kiritish jarayonini qayta sinab ko'rish mumkin.
    Barcha sinov litsenziyalarini ham UNUSED holatiga qaytaradi.
    """
    # 1. Joriy foydalanuvchi litsenziyalarini bekor qilish
    user_licenses = db.query(LicenseKey).filter(LicenseKey.user_id == current_user.id).all()
    for l in user_licenses:
        l.status = LicenseStatus.UNUSED
        l.user_id = None
        l.activated_at = None
        l.expires_at = None

    # 2. Barcha namunaviy sinov kodlarini ham UNUSED holatiga keltirish
    test_keys = db.query(LicenseKey).filter(
        (LicenseKey.key_code.like("EDU-TEST-%")) | 
        (LicenseKey.key_code.like("EDU-MAKTAB-%"))
    ).all()
    for tk in test_keys:
        tk.status = LicenseStatus.UNUSED
        tk.user_id = None
        tk.activated_at = None
        tk.expires_at = None
        
    current_user.trial_assessments_used = 0
    db.commit()
    return {"message": "Litsenziya tozalandi. Endi yangi kod kiritishni sinab ko'rishingiz mumkin."}


@router.post("/admin/generate", response_model=List[LicenseResponse])
def admin_generate_keys(
    payload: LicenseGenerateRequest,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    ADMIN UCHUN: Yangi litsenziya kodlarini ommaviy generatsiya qilish.
    Ushbu kodlarni mijozlarga sotish mumkin.
    """
    new_keys = create_license_keys(
        db,
        count=payload.count,
        duration_days=payload.duration_days,
        plan_type=payload.plan_type,
        notes=payload.notes
    )
    return new_keys


@router.get("/admin/list", response_model=List[LicenseResponse])
def admin_list_keys(
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """ADMIN UCHUN: Barcha yaratilgan kodlar ro'yxatini ko'rish"""
    keys = db.query(LicenseKey).order_by(LicenseKey.created_at.desc()).all()
    return keys
