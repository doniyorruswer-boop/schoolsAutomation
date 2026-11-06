from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import Optional
from pathlib import Path
import os

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
DEFAULT_DB_FILE = BACKEND_DIR / "schools_auto.db"


class Settings(BaseSettings):
    PROJECT_NAME: str = "O'qituvchi AI Yordamchisi"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Xavfsizlik
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-key-change-in-production-12345678")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30  # 30 kun
    
    # Ma'lumotlar bazasi (Boshlanishiga SQLite, xohlasa PostgreSQL ga almashtirish mumkin)
    DATABASE_URL: str = f"sqlite:///{DEFAULT_DB_FILE}"

    @field_validator("DATABASE_URL", mode="after")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        if v and v.startswith("sqlite:///./"):
            rel_name = v.replace("sqlite:///./", "")
            return f"sqlite:///{BACKEND_DIR / rel_name}"
        return v
    
    # Sun'iy intellekt (Gemini API)
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
    
    # Litsenziya sozlamalari
    TRIAL_ASSESSMENTS_ALLOWED: int = 1  # Bepul sinov uchun 1 ta BSB yaratish imkoniyati

    model_config = {
        "case_sensitive": True,
        "env_file": [str(BACKEND_DIR / ".env"), ".env"]
    }


settings = Settings()
