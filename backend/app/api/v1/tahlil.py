import urllib.parse
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.models.audit import AuditLog
from app.schemas.tahlil import TahlilSummaryResponse
from app.api.v1.dependencies import get_current_user
from app.services.excel_service import ExcelTahlilService
from app.services.word_service import WordDocumentService

router = APIRouter(prefix="/tahlil", tags=["Tahlil Bayonnomasi"])


@router.post("/process-excel", response_model=TahlilSummaryResponse)
async def process_excel(
    file: UploadFile = File(..., description="e-Maktabdan yuklangan Excel fayl"),
    subject_name: str = Form(...),
    class_name: str = Form(...),
    assessment_title: str = Form(...),
    max_score: float = Form(default=100.0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    2-Modul: e-Maktab Excel faylini yuklash va hisoblash.
    O'quvchi ismlari bazada saqlanmaydi, faqat kod hisoblaydi!
    """
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Faqat Excel (.xlsx, .xls) fayli yuklanishi kerak."
        )

    content_bytes = await file.read()
    summary = ExcelTahlilService.process_emaktab_excel(
        file_bytes=content_bytes,
        subject_name=subject_name,
        class_name=class_name,
        assessment_title=assessment_title,
        max_possible_score=max_score
    )

    audit = AuditLog(
        user_id=current_user.id,
        action="PROCESS_TAHLIL_EXCEL",
        entity_type="ExcelTahlil",
        details={
            "subject": subject_name,
            "class": class_name,
            "mastery_pct": summary.statistics.mastery_percentage,
            "quality_pct": summary.statistics.quality_percentage
        }
    )
    db.add(audit)
    db.commit()

    return summary


@router.post("/export-word")
async def export_tahlil_word(
    file: UploadFile = File(...),
    subject_name: str = Form(...),
    class_name: str = Form(...),
    assessment_title: str = Form(...),
    max_score: float = Form(default=100.0),
    current_user: User = Depends(get_current_user)
):
    """
    Hisoblangan natijalarni to'g'ridan-to'g'ri rasmiy 'BSB Tahlil Bayonnomasi.docx'
    Word hujjati shaklida chiqarib beradi.
    """
    content_bytes = await file.read()
    summary = ExcelTahlilService.process_emaktab_excel(
        file_bytes=content_bytes,
        subject_name=subject_name,
        class_name=class_name,
        assessment_title=assessment_title,
        max_possible_score=max_score
    )

    doc_stream = WordDocumentService.generate_tahlil_bayonnomasi_doc(
        tahlil=summary,
        school_name=current_user.school_name or "Umumta'lim maktabi",
        teacher_name=current_user.full_name
    )

    safe_ascii = "Tahlil_Bayonnomasi.docx"
    encoded_filename = urllib.parse.quote(f"Tahlil_Bayonnomasi_{class_name}_{subject_name}.docx")
    return StreamingResponse(
        doc_stream,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{safe_ascii}"; filename*=UTF-8\'\'{encoded_filename}'}
    )
