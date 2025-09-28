from typing import List, Optional, Dict, Any
from pydantic import BaseModel


class Message(BaseModel):
    role: str
    content: str


class CaseFile(BaseModel):
    id: str
    title: str
    excerpt: Optional[str] = None
    story: Optional[str] = None
    hints: List[str] = []
    suspects: List[Dict[str, Any]]
    timeline: Optional[Dict[str, Any]] = None


class InterrogationPayload(BaseModel):
    caseFile: CaseFile
    suspectId: str
    messages: List[Message]
    assistantReply: Optional[str] = None
    claims: Optional[Dict[str, Any]] = None


class Lead(BaseModel):
    title: str
    tags: List[str]
    justification: str


class InterrogationResult(BaseModel):
    leads: List[Lead]
    consistency: float


