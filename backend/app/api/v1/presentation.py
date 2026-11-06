import urllib.parse
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from app.services.presentation_service import PresentationService
from app.api.v1.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/presentation", tags=["Dars Taqdimoti (PowerPoint)"])


class PresentationGenerateRequest(BaseModel):
    subject_name: str = Field(..., description="Fan nomi, masalan: Algebra")
    grade: int = Field(default=7, ge=1, le=11)
    topic_title: str = Field(..., description="Dars mavzusi")
    slide_count: int = Field(default=5, ge=3, le=10)
    include_images: bool = Field(default=True, description="Rasmlarni qo'shish yoki matnli qilish (ON/OFF)")
    lang: str = Field(default="uz", description="Til: 'uz' yoki 'ru'")


@router.post("/generate")
async def generate_presentation_plan(
    payload: PresentationGenerateRequest,
    current_user: User = Depends(get_current_user)
):
    """
    AI yordamida chuqur dars slaydlari rejasini generatsiya qilish.
    """
    data = await PresentationService.generate_presentation_data(
        subject_name=payload.subject_name,
        grade=payload.grade,
        topic_title=payload.topic_title,
        slide_count=payload.slide_count,
        include_images=payload.include_images,
        lang=payload.lang
    )
    return data


@router.post("/export-pptx")
async def export_pptx(
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """
    Slaydlar rejasidan (tahrirlangan matnlar va rasmlar bilan)
    haqiqiy PowerPoint (.pptx) fayli yasash.
    """
    include_images = payload.get("include_images", True)
    pptx_stream = await PresentationService.create_pptx_file_async(payload, include_images=include_images)
    
    safe_ascii = "Taqdimot.pptx"
    raw_title = payload.get("title", "Taqdimot").replace(" ", "_")[:30]
    encoded_filename = urllib.parse.quote(f"Taqdimot_{raw_title}.pptx")
    
    return StreamingResponse(
        pptx_stream,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        headers={"Content-Disposition": f'attachment; filename="{safe_ascii}"; filename*=UTF-8\'\'{encoded_filename}'}
    )
