from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User
from app.services.license_service import verify_user_license_or_trial

security = HTTPBearer(auto_error=False)


def get_optional_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    if not credentials:
        return db.query(User).first()
    try:
        payload = decode_access_token(credentials.credentials)
        if not payload or "sub" not in payload:
            return db.query(User).first()
        user_id = int(payload["sub"])
        return db.query(User).filter(User.id == user_id).first()
    except Exception:
        return db.query(User).first()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    if not credentials:
        # Agar token yo'q bo'lsa, test va boshlang'ich qulaylik uchun 1-foydalanuvchini olamiz (yoki yaratamiz)
        user = db.query(User).first()
        if not user:
            user = User(
                full_name="Namuna O'qituvchi",
                phone_number="+998901234567",
                school_name="Toshkent shahar 1-sonli maktab",
                is_admin=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        return user

    payload = decode_access_token(credentials.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Noto'g'ri yoki eskirgan sessiya tokeni. Iltimos, qayta kiring."
        )

    user_id = int(payload["sub"])
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Foydalanuvchi topilmadi.")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Hisobingiz faol emas.")

    return user


def require_license_or_trial(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> User:
    """Litsenziya tekshiruvi: faol litsenziya yoki bepul sinov bo'lishi shart!"""
    is_allowed, reason = verify_user_license_or_trial(db, current_user)
    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=reason
        )
    return current_user


def require_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ushbu amalni bajarish uchun administrator huquqi talab qilinadi."
        )
    return current_user
