import urllib.parse
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.user import User
from app.models.curriculum import Subject, Topic
from app.models.lesson_plan import LessonPlan
from app.schemas.lesson_plan import (
    KTPGenerateRequest,
    KonspektGenerateRequest,
    LessonPlanResponse
)
from app.api.v1.dependencies import get_current_user, require_license_or_trial
from app.services.ktp_service import KTPService

router = APIRouter(prefix="/ktp", tags=["Taqvim-Mavzu Reja (KTP) va Dars Ishlanmasi"])


@router.post("/generate", response_model=LessonPlanResponse)
async def generate_ktp(
    payload: KTPGenerateRequest,
    current_user: User = Depends(require_license_or_trial),
    db: Session = Depends(get_db)
):
    """
    4-Modul: Taqvim-Mavzu Reja (KTP) generatsiyasi.
    Vazirlik DTS standartidagi mavzular va haftalar bo'yicha to'liq taqsimot.
    """
    subject = db.query(Subject).filter(Subject.id == payload.subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Tanlangan fan topilmadi.")

    # Fan va sinfga tegishli mavzularni olish (shaxsiy mavzular va rasmiy mavzular)
    topics = db.query(Topic).filter(
        Topic.subject_id == payload.subject_id,
        Topic.grade == payload.grade,
        (Topic.author_id.is_(None)) | (Topic.author_id == current_user.id)
    ).all()

    content = await KTPService.generate_ktp(
        subject=subject,
        grade=payload.grade,
        period=payload.period,
        hours_per_week=payload.hours_per_week,
        school_year=payload.school_year or "2024-2025",
        include_bsb_chsb=payload.include_bsb_chsb,
        topics=topics,
        user=current_user,
        lang=payload.lang
    )

    plan = LessonPlan(
        author_id=current_user.id,
        plan_type="KTP",
        title=content["title"],
        subject_id=payload.subject_id,
        grade=payload.grade,
        quarter=0 if payload.period == "annual" else int(payload.period.split("_")[-1]),
        hours_per_week=payload.hours_per_week,
        total_hours=content["total_hours"],
        content=content
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)

    return plan


@router.post("/upload-file", response_model=LessonPlanResponse)
async def upload_ktp_file(
    file: UploadFile = File(..., description="O'qituvchining KTP fayli (.docx, .xlsx, .pdf)"),
    subject_id: int = Form(...),
    grade: int = Form(default=7),
    lang: str = Form(default="uz"),
    current_user: User = Depends(require_license_or_trial),
    db: Session = Depends(get_db)
):
    """
    O'qituvchining o'z tasdiqlangan KTP faylini yuklash (Word, Excel, PDF).
    Mavzular avtomatik ajratilib, o'qituvchi profiliga qulflanadi va KTP shakllantiriladi.
    """
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Tanlangan fan topilmadi.")

    filename = file.filename or "ktp_reja.docx"
    ext = filename.lower().split(".")[-1] if "." in filename else ""
    if ext not in ["docx", "xlsx", "xls", "pdf"]:
        raise HTTPException(
            status_code=400,
            detail="Faqat Word (.docx), Excel (.xlsx) yoki PDF (.pdf) formatdagi fayllar qabul qilinadi."
        )

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Fayl bo'sh bo'lishi mumkin emas.")

    if len(file_bytes) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Fayl hajmi 25 MB dan oshmasligi kerak.")

    try:
        content = await KTPService.import_ktp_file(
            file_bytes=file_bytes,
            filename=filename,
            subject=subject,
            grade=grade,
            user=current_user,
            lang=lang,
            db=db
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    plan = LessonPlan(
        author_id=current_user.id,
        plan_type="KTP",
        title=content["title"],
        subject_id=subject.id,
        grade=grade,
        quarter=0,
        hours_per_week=2,
        total_hours=content.get("total_hours", len(content.get("schedule", []))),
        content=content
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)

    return plan


@router.post("/generate-konspekt", response_model=LessonPlanResponse)
async def generate_konspekt(
    payload: KonspektGenerateRequest,
    current_user: User = Depends(require_license_or_trial),
    db: Session = Depends(get_db)
):
    """
    45 daqiqalik Kundalik Dars Ishlanmasi (Konspekt) generatsiyasi.
    """
    subject = db.query(Subject).filter(Subject.id == payload.subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Tanlangan fan topilmadi.")

    content = await KTPService.generate_konspekt(
        subject=subject,
        grade=payload.grade,
        quarter=payload.quarter,
        topic_title=payload.topic_title,
        lesson_type=payload.lesson_type,
        methods=payload.methods,
        user=current_user,
        lang=payload.lang
    )

    is_ru = payload.lang.lower() == "ru"
    plan_title = (
        f"{payload.grade}-sinf {subject.name}: {payload.topic_title} (Konspekt)"
        if not is_ru else
        f"{payload.grade}-й класс {subject.name}: {payload.topic_title} (Конспект)"
    )

    plan = LessonPlan(
        author_id=current_user.id,
        plan_type="KONSPEKT",
        title=plan_title,
        subject_id=payload.subject_id,
        grade=payload.grade,
        quarter=payload.quarter,
        topic_title=payload.topic_title,
        content=content
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)

    return plan


@router.get("/my-plans", response_model=List[LessonPlanResponse])
def get_my_lesson_plans(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """O'qituvchining shaxsiy saqlangan KTP va dars ishlanmalari ro'yxati"""
    return db.query(LessonPlan).filter(LessonPlan.author_id == current_user.id).order_by(LessonPlan.created_at.desc()).all()


@router.get("/{plan_id}", response_model=LessonPlanResponse)
def get_lesson_plan(
    plan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    plan = db.query(LessonPlan).filter(
        LessonPlan.id == plan_id,
        LessonPlan.author_id == current_user.id
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Reja yoki konspekt topilmadi.")
    return plan


@router.get("/{plan_id}/export-word")
def export_lesson_plan_word(
    plan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Word (.docx) formatida yuklab olish"""
    plan = db.query(LessonPlan).filter(
        LessonPlan.id == plan_id,
        LessonPlan.author_id == current_user.id
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Hujjat topilmadi.")

    is_ktp = plan.plan_type == "KTP"
    is_ru = any('\u0400' <= c <= '\u04FF' for c in plan.title)

    if is_ktp:
        file_stream = KTPService.export_ktp_word(plan.content, current_user, lang="ru" if is_ru else "uz")
        ascii_fallback = f"KTP_{plan.grade}sinf.docx"
        utf8_filename = f"{plan.title}.docx"
    else:
        file_stream = KTPService.export_konspekt_word(plan.content, current_user, lang="ru" if is_ru else "uz")
        ascii_fallback = f"Konspekt_{plan.grade}sinf.docx"
        utf8_filename = f"{plan.title}.docx"

    encoded_filename = urllib.parse.quote(utf8_filename)

    return StreamingResponse(
        file_stream,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f'attachment; filename="{ascii_fallback}"; filename*=UTF-8\'\'{encoded_filename}'
        }
    )
