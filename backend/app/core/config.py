from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    PROJECT_NAME: str = "O'qituvchi AI Yordamchisi"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Xavfsizlik
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-key-change-in-production-12345678")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30  # 30 kun
    
    # Ma'lumotlar bazasi (Boshlanishiga SQLite, xohlasa PostgreSQL ga almashtirish mumkin)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./schools_auto.db")
    
    # Sun'iy intellekt (Gemini API)
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
    
    # Litsenziya sozlamalari
    TRIAL_ASSESSMENTS_ALLOWED: int = 1  # Bepul sinov uchun 1 ta BSB yaratish imkoniyati

    model_config = {
        "case_sensitive": True,
        "env_file": ".env"
    }


settings = Settings()
