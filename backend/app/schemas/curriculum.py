from pydantic import BaseModel, ConfigDict
from typing import Optional, List


class TopicResponse(BaseModel):
    id: int
    subject_id: int
    grade: int
    quarter: int
    chapter: Optional[str] = None
    title: str
    learning_objectives: Optional[str] = None
    author_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class SubjectResponse(BaseModel):
    id: int
    name: str
    code: str
    topics: List[TopicResponse] = []

    model_config = ConfigDict(from_attributes=True)


class ScannedTopicItem(BaseModel):
    title: str
    chapter: Optional[str] = None
    quarter: int = 1
    learning_objectives: Optional[str] = None


class SaveScannedTopicsRequest(BaseModel):
    subject_id: int
    grade: int
    quarter: int
    topics: List[ScannedTopicItem]


class TopicCreateRequest(BaseModel):
    subject_id: int
    grade: int
    quarter: int
    title: str
    chapter: Optional[str] = "Qo'lda kiritilgan"
    learning_objectives: Optional[str] = None
