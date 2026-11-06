import urllib.parse
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.core.database import get_db
from app.models.user import User
from app.models.curriculum import Subject, Topic
from app.models.assessment import Assessment, AssessmentStatus, AssessmentType
from app.models.audit import AuditLog
from app.schemas.assessment import BSBCreateRequest, BSBUpdateRequest, AssessmentResponse, QuestionSwapRequest
from app.api.v1.dependencies import get_current_user, require_license_or_trial
from app.services.ai_service import AIService
from app.services.validator_service import AssessmentValidator
from app.services.word_service import WordDocumentService

router = APIRouter(prefix="/bsb", tags=["BSB va CHSB Generatori"])


@router.post("/generate", response_model=AssessmentResponse)
async def generate_bsb(
    payload: BSBCreateRequest,
    current_user: User = Depends(require_license_or_trial),
    db: Session = Depends(get_db)
):
    """
    1-Modul: BSB/CHSB generatori.
    AI taklif qiladi -> Dasturiy validator tekshiradi -> DRAFT holatida saqlanadi.
    """
    subject = db.query(Subject).filter(Subject.id == payload.subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Tanlangan fan topilmadi.")

    topics = []
    if payload.topic_ids:
        topics.extend(db.query(Topic).filter(Topic.id.in_(payload.topic_ids)).all())

    # Qo'lda yozilgan mavzular bo'lsa (manual_topics)
    if payload.manual_topics:
        for m_title in payload.manual_topics:
            clean_m_title = m_title.strip()
            if clean_m_title:
                existing = db.query(Topic).filter(
                    Topic.subject_id == payload.subject_id,
                    Topic.grade == payload.grade,
                    Topic.quarter == payload.quarter,
                    Topic.title == clean_m_title
                ).first()
                if not existing:
                    new_topic = Topic(
                        subject_id=payload.subject_id,
                        grade=payload.grade,
                        quarter=payload.quarter,
                        chapter="Qo'lda kiritilgan",
                        title=clean_m_title,
                        learning_objectives="O'qituvchi tomonidan belgilangan mavzu",
                        author_id=current_user.id
                    )
                    db.add(new_topic)
                    db.commit()
                    db.refresh(new_topic)
                    topics.append(new_topic)
                else:
                    if existing not in topics:
                        topics.append(existing)

    if not topics:
        raise HTTPException(status_code=400, detail="Kamida bitta to'g'ri mavzu tanlanishi yoki qo'lda kiritilishi shart.")

    final_topic_ids = [t.id for t in topics]

    # 1. AI orqali taklif generatsiyasi
    raw_content = await AIService.generate_bsb(
        subject=subject,
        grade=payload.grade,
        quarter=payload.quarter,
        topics=topics,
        total_max_score=payload.total_max_score,
        variants_count=payload.variants_count,
        question_count=payload.question_count,
        custom_instructions=payload.custom_instructions,
        textbook_pages=payload.textbook_pages,
        lang=payload.lang
    )

    # 2. Dasturiy validator orqali nazorat va ballarni qayta hisoblash
    is_valid, validation_report = AssessmentValidator.validate_assessment_content(
        content=raw_content,
        target_total_score=payload.total_max_score
    )

    # 3. Bazaga Qoralama (DRAFT) holatida saqlash
    assessment = Assessment(
        author_id=current_user.id,
        title=payload.title,
        assessment_type=payload.assessment_type,
        subject_id=payload.subject_id,
        grade=payload.grade,
        quarter=payload.quarter,
        topic_ids=final_topic_ids,
        total_max_score=payload.total_max_score,
        variants_count=payload.variants_count,
        status=AssessmentStatus.DRAFT,
        content=raw_content,
        validation_report=validation_report
    )
    db.add(assessment)

    # Foydalanuvchining sinov hisoblagichini oshirish
    current_user.trial_assessments_used += 1

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="CREATE_BSB_DRAFT",
        entity_type="Assessment",
        details={"title": payload.title, "is_valid": is_valid}
    )
    db.add(audit)

    db.commit()
    db.refresh(assessment)
    return assessment


@router.get("/my-list", response_model=List[AssessmentResponse])
def get_my_assessments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """O'qituvchining barcha yaratgan BSB/CHSB lari ro'yxati"""
    return db.query(Assessment).filter(Assessment.author_id == current_user.id).order_by(Assessment.created_at.desc()).all()


@router.get("/{assessment_id}", response_model=AssessmentResponse)
def get_assessment(
    assessment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Alohida BSB ma'lumotlarini olish"""
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id, Assessment.author_id == current_user.id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Baholash hujjati topilmadi.")
    return assessment


@router.put("/{assessment_id}", response_model=AssessmentResponse)
def update_assessment(
    assessment_id: int,
    payload: BSBUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """O'qituvchi tomonidan BSB savollari yoki balini tahrirlash"""
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id, Assessment.author_id == current_user.id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Baholash hujjati topilmadi.")

    if payload.title:
        assessment.title = payload.title
    if payload.content:
        # Qayta validatsiya qilish
        is_valid, validation_report = AssessmentValidator.validate_assessment_content(
            content=payload.content.model_dump(),
            target_total_score=assessment.total_max_score
        )
        assessment.content = payload.content.model_dump()
        assessment.validation_report = validation_report
        
    if payload.status:
        assessment.status = payload.status

    db.commit()
    db.refresh(assessment)
    return assessment


@router.post("/{assessment_id}/swap-question", response_model=AssessmentResponse)
async def swap_question(
    assessment_id: int,
    payload: QuestionSwapRequest,
    current_user: User = Depends(require_license_or_trial),
    db: Session = Depends(get_db)
):
    """
    3-Modul: Interaktiv savol almashtirish.
    O'qituvchi ma'qul ko'rmagan bitta savolni boshqa muqobil topshiriqqa almashtirish.
    Ballar va mezonlar mutanosibligi to'liq saqlanadi.
    """
    assessment = db.query(Assessment).filter(
        Assessment.id == assessment_id,
        Assessment.author_id == current_user.id
    ).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Baholash hujjati topilmadi.")

    content = dict(assessment.content)
    variants = content.get("variants", [])
    target_var = next((v for v in variants if v.get("variant_number") == payload.variant_number), None)
    if not target_var:
        raise HTTPException(status_code=404, detail=f"{payload.variant_number}-variant topilmadi.")

    questions = target_var.get("questions", [])
    q_idx = next((i for i, q in enumerate(questions) if q.get("number") == payload.question_number), None)
    if q_idx is None:
        raise HTTPException(status_code=404, detail=f"{payload.question_number}-savol topilmadi.")

    old_q = questions[q_idx]

    subject = db.query(Subject).filter(Subject.id == assessment.subject_id).first()
    topics = db.query(Topic).filter(Topic.id.in_(assessment.topic_ids)).all()

    new_q = await AIService.swap_single_question(
        subject=subject,
        grade=assessment.grade,
        quarter=assessment.quarter,
        topics=topics,
        current_question=old_q,
        preferred_difficulty=payload.preferred_difficulty,
        custom_hint=payload.custom_hint,
        textbook_pages=content.get("textbook_pages"),
        lang=payload.lang
    )

    questions[q_idx] = new_q
    target_var["questions"] = questions

    # Qayta dasturiy validatsiya
    is_valid, validation_report = AssessmentValidator.validate_assessment_content(
        content=content,
        target_total_score=assessment.total_max_score
    )

    from sqlalchemy.orm.attributes import flag_modified
    assessment.content = content
    assessment.validation_report = validation_report
    flag_modified(assessment, "content")

    db.commit()
    db.refresh(assessment)
    return assessment


@router.post("/{assessment_id}/approve", response_model=AssessmentResponse)
def approve_assessment(
    assessment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    O'qituvchi BSB ni rasman tasdiqlaydi.
    Status DRAFT dan APPROVED ga o'tadi va chop etish belgisi toza rasmiy bo'ladi.
    """
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id, Assessment.author_id == current_user.id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Baholash hujjati topilmadi.")

    assessment.status = AssessmentStatus.APPROVED
    
    audit = AuditLog(
        user_id=current_user.id,
        action="APPROVE_BSB",
        entity_type="Assessment",
        entity_id=assessment.id
    )
    db.add(audit)
    
    db.commit()
    db.refresh(assessment)
    return assessment


@router.get("/{assessment_id}/export-word")
def export_bsb_word(
    assessment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Rasmiy Word (.docx) formatida yuklab olish.
    Agar status DRAFT bo'lsa, 'TASDIQLANMAGAN' suv belgisi bilan chiqadi.
    """
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id, Assessment.author_id == current_user.id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Baholash hujjati topilmadi.")

    subject = db.query(Subject).filter(Subject.id == assessment.subject_id).first()
    subject_name = subject.name if subject else "Fan"

    file_stream = WordDocumentService.generate_bsb_document(
        assessment_title=assessment.title,
        subject_name=subject_name,
        grade=assessment.grade,
        content=assessment.content,
        status=assessment.status
    )

    safe_ascii = f"BSB_{assessment.id}.docx"
    encoded_filename = urllib.parse.quote(f"{assessment.title.replace(' ', '_')}.docx")
    return StreamingResponse(
        file_stream,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{safe_ascii}"; filename*=UTF-8\'\'{encoded_filename}'}
    )
