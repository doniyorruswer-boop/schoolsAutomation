import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.license import LicenseKey, PlanType, LicenseStatus
from app.models.user import User
from app.core.config import settings


def generate_unique_key_code() -> str:
    """Xavfsiz va chiroyli litsenziya kodi generatsiya qiladi: EDU-XXXX-YYYY-ZZZZ"""
    alphabet = string.ascii_uppercase + string.digits
    part1 = ''.join(secrets.choice(alphabet) for _ in range(4))
    part2 = ''.join(secrets.choice(alphabet) for _ in range(4))
    part3 = ''.join(secrets.choice(alphabet) for _ in range(4))
    return f"EDU-{part1}-{part2}-{part3}"


def create_license_keys(
    db: Session,
    count: int = 1,
    duration_days: int = 30,
    plan_type: PlanType = PlanType.STANDARD,
    notes: Optional[str] = None
) -> List[LicenseKey]:
    """Admin uchun yangi faollashtirish kodlarini yaratish"""
    created_keys = []
    for _ in range(count):
        code = generate_unique_key_code()
        # Takrorlanmaslikni tekshirish
        while db.query(LicenseKey).filter(LicenseKey.key_code == code).first():
            code = generate_unique_key_code()
            
        key_obj = LicenseKey(
            key_code=code,
            plan_type=plan_type,
            duration_days=duration_days,
            status=LicenseStatus.UNUSED,
            notes=notes
        )
        db.add(key_obj)
        created_keys.append(key_obj)
        
    db.commit()
    for k in created_keys:
        db.refresh(k)
    return created_keys


def activate_user_license(db: Session, user: User, key_code: str) -> LicenseKey:
    """O'qituvchi tomonidan kod kiritilganda faollashtirish"""
    key_code_clean = key_code.strip().upper()
    license_obj = db.query(LicenseKey).filter(LicenseKey.key_code == key_code_clean).first()
    
    if not license_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kiritilgan faollashtirish kodi topilmadi. Kodni to'g'ri kiritganingizni tekshiring."
        )
        
    if license_obj.status == LicenseStatus.REVOKED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ushbu kod bekor qilingan."
        )
        
    now = datetime.now(timezone.utc)

    if license_obj.status == LicenseStatus.ACTIVE and license_obj.user_id != user.id:
        is_test_key = (
            license_obj.key_code.startswith("EDU-TEST-") or
            license_obj.key_code.startswith("EDU-MAKTAB-") or
            "TEST" in license_obj.key_code
        )
        if not is_test_key:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ushbu kod allaqachon boshqa foydalanuvchi hisobiga bog'langan!"
            )
        
    # Yangi faollashtirish yoki sinov kodini biriktirish
    license_obj.user_id = user.id
    license_obj.activated_at = now
    license_obj.expires_at = now + timedelta(days=license_obj.duration_days)
    license_obj.status = LicenseStatus.ACTIVE
    
    db.commit()
    db.refresh(license_obj)
    return license_obj


def verify_user_license_or_trial(db: Session, user: User) -> Tuple[bool, str]:
    """
    Foydalanuvchining faol litsenziyasi yoki bepul sinov imkoniyati borligini tekshiradi.
    (ruxsat_bormi, sabab_matni)
    """
    now = datetime.now(timezone.utc)
    
    # 1. Faol litsenziyani tekshirish
    active_license = db.query(LicenseKey).filter(
        LicenseKey.user_id == user.id,
        LicenseKey.status == LicenseStatus.ACTIVE
    ).first()
    
    if active_license and active_license.expires_at:
        # Naive / aware solishtirishni xavfsiz qilish
        exp_at = active_license.expires_at
        if exp_at.tzinfo is None:
            exp_at = exp_at.replace(tzinfo=timezone.utc)
            
        if exp_at > now:
            days_left = (exp_at - now).days
            return True, f"Faol litsenziya ({active_license.plan_type.value}), {days_left} kun qoldi."
        
    # 2. Agar litsenziya bo'lmasa, bepul sinov (Trial) chegarasini tekshirish
    if user.trial_assessments_used < settings.TRIAL_ASSESSMENTS_ALLOWED:
        left = settings.TRIAL_ASSESSMENTS_ALLOWED - user.trial_assessments_used
        return True, f"Bepul sinov rejimi: {left} ta imkoniyat qolgan."
        
    return False, "Litsenziyangiz muddati tugagan yoki mavjud emas. Davom etish uchun faollashtirish kodini kiriting."
