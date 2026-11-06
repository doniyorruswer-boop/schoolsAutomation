from fastapi import APIRouter, Depends, Query, UploadFile, File, Form, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.user import User
from app.models.curriculum import Subject, Topic
from app.schemas.curriculum import (
    SubjectResponse, TopicResponse, ScannedTopicItem, 
    SaveScannedTopicsRequest, TopicCreateRequest
)
from app.services.ocr_service import TopicScannerService
from app.data.seed_data.curriculum_seed import CURRICULUM_DATA
from app.api.v1.dependencies import get_current_user, get_optional_current_user

router = APIRouter(prefix="/curriculum", tags=["O'quv Dasturi va Mavzular"])


@router.get("/subjects", response_model=List[SubjectResponse])
def get_subjects(db: Session = Depends(get_db)):
    """Fanlar ro'yxatini olish"""
    subjects = db.query(Subject).all()
    return subjects


@router.get("/topics", response_model=List[TopicResponse])
def get_topics(
    subject_id: int = Query(...),
    grade: int = Query(...),
    quarter: Optional[int] = Query(None),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    Belgilangan fan, sinf va chorak bo'yicha rasmiy tasdiqlangan mavzular ro'yxati.
    Har bir obunachi rasmiy standart mavzularni VA faqat o'zi qo'shgan shaxsiy mavzularini ko'radi.
    Boshqa obunachilarning shaxsiy mavzulari ko'rinmaydi.
    """
    query = db.query(Topic).filter(
        Topic.subject_id == subject_id,
        Topic.grade == grade
    )
    if quarter is not None:
        query = query.filter(Topic.quarter == quarter)
        
    if current_user:
        query = query.filter(
            or_(
                Topic.author_id.is_(None),
                Topic.author_id == current_user.id
            )
        )
    else:
        query = query.filter(Topic.author_id.is_(None))

    topics = query.all()
    return topics


@router.post("/topics", response_model=TopicResponse)
def add_manual_topic(
    payload: TopicCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    O'qituvchi tomonidan yangi mavzuni qo'lda kiritish (matn shaklida).
    Faqat ushbu o'qituvchining shaxsiy hisobiga bog'lanadi.
    """
    subject = db.query(Subject).filter(Subject.id == payload.subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Fan topilmadi.")

    clean_title = payload.title.strip()
    if not clean_title:
        raise HTTPException(status_code=400, detail="Mavzu nomi bo'sh bo'lmasligi kerak.")

    # Mavjudligini tekshirish (rasmiy yoki o'ziniki bo'lsa)
    existing = db.query(Topic).filter(
        Topic.subject_id == payload.subject_id,
        Topic.grade == payload.grade,
        Topic.quarter == payload.quarter,
        Topic.title == clean_title,
        or_(Topic.author_id == current_user.id, Topic.author_id.is_(None))
    ).first()
    if existing:
        return existing

    topic = Topic(
        subject_id=payload.subject_id,
        grade=payload.grade,
        quarter=payload.quarter,
        chapter=payload.chapter or "Qo'lda kiritilgan",
        title=clean_title,
        learning_objectives=payload.learning_objectives,
        author_id=current_user.id # Shaxsiy ajratish
    )
    db.add(topic)
    db.commit()
    db.refresh(topic)
    return topic


@router.delete("/topics/{topic_id}")
def delete_topic(
    topic_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Ro'yxatdan keraksiz / toshib ketgan mavzuni o'chirish.
    O'qituvchi faqat o'zi qo'shgan mavzuni o'chira oladi.
    """
    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Mavzu topilmadi.")
    
    if topic.author_id is not None and topic.author_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Boshqa o'qituvchining mavzusini o'chira olmaysiz.")

    db.delete(topic)
    db.commit()
    return {"success": True, "deleted_id": topic_id}


@router.post("/topics/reset-standard")
def reset_standard_topics(
    subject_id: int = Query(...),
    grade: int = Query(...),
    quarter: int = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    O'qituvchining faqat o'zi qo'shgan shaxsiy mavzularini tozalash.
    """
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Fan topilmadi.")

    db.query(Topic).filter(
        Topic.subject_id == subject_id,
        Topic.grade == grade,
        Topic.quarter == quarter,
        Topic.author_id == current_user.id
    ).delete()
    db.commit()

    return db.query(Topic).filter(
        Topic.subject_id == subject_id,
        Topic.grade == grade,
        Topic.quarter == quarter,
        or_(Topic.author_id.is_(None), Topic.author_id == current_user.id)
    ).all()


@router.post("/scan-topics", response_model=List[ScannedTopicItem])
async def scan_topics_from_file(
    file: UploadFile = File(..., description="Kitob mundarijasi, reja daftari rasmi (JPG/PNG) yoki PDF"),
    subject_id: Optional[int] = Form(None),
    grade: int = Form(default=7),
    db: Session = Depends(get_db)
):
    """
    Skaner / Fayl o'quvchi:
    Kitob mundarijasi yoki daftarni rasm/PDF holatida qabul qilib,
    sun'iy intellekt orqali dars mavzularini ajratib beradi.
    """
    subject_name = ""
    if subject_id:
        subj = db.query(Subject).filter(Subject.id == subject_id).first()
        if subj:
            subject_name = subj.name

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Fayl bo'sh bo'lishi mumkin emas.")

    topics = await TopicScannerService.scan_file_for_topics(
        file_bytes=file_bytes,
        filename=file.filename or "scan.jpg",
        mime_type=file.content_type or "image/jpeg",
        subject_hint=subject_name,
        grade_hint=grade
    )
    return topics


@router.post("/save-scanned-topics", response_model=List[TopicResponse])
def save_scanned_topics(
    payload: SaveScannedTopicsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Skanerlangan va o'qituvchi tomonidan tasdiqlangan mavzularni
    faqat ushbu obunachining shaxsiy o'quv bazasiga saqlash.
    """
    subject = db.query(Subject).filter(Subject.id == payload.subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Fan topilmadi.")

    saved_topics = []
    for item in payload.topics:
        existing = db.query(Topic).filter(
            Topic.subject_id == payload.subject_id,
            Topic.grade == payload.grade,
            Topic.title == item.title,
            or_(Topic.author_id == current_user.id, Topic.author_id.is_(None))
        ).first()
        
        if not existing:
            new_t = Topic(
                subject_id=payload.subject_id,
                grade=payload.grade,
                quarter=payload.quarter,
                chapter=item.chapter or "Mundarija bo'yicha",
                title=item.title,
                learning_objectives=item.learning_objectives,
                author_id=current_user.id
            )
            db.add(new_t)
            saved_topics.append(new_t)
        else:
            saved_topics.append(existing)

    db.commit()
    for t in saved_topics:
        db.refresh(t)
    return saved_topics
