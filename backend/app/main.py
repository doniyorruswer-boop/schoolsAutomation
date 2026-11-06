from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.init_db import init_database

from app.api.v1.auth import router as auth_router
from app.api.v1.license import router as license_router
from app.api.v1.curriculum import router as curriculum_router
from app.api.v1.bsb import router as bsb_router
from app.api.v1.tahlil import router as tahlil_router
from app.api.v1.presentation import router as presentation_router
from app.api.v1.ktp import router as ktp_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Dastur ishga tushganda ma'lumotlar bazasi va dastlabki mavzularni tekshirish / yaratish
    init_database()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="O'qituvchilarning qog'ozbozlik ishlarini avtomatlashtirish, BSB/CHSB va tahlil bayonnomasi tizimi.",
    lifespan=lifespan
)

# CORS sozlamalari (PWA va mobil brauzerlar uchun)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routerlarini ulash
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(license_router, prefix=settings.API_V1_STR)
app.include_router(curriculum_router, prefix=settings.API_V1_STR)
app.include_router(bsb_router, prefix=settings.API_V1_STR)
app.include_router(tahlil_router, prefix=settings.API_V1_STR)
app.include_router(presentation_router, prefix=settings.API_V1_STR)
app.include_router(ktp_router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "documentation": "/docs"
    }


@app.get("/health")
def health():
    return {"status": "healthy"}
