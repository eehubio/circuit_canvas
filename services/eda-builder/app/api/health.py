from fastapi import APIRouter
from app.pipeline import phase2_capabilities

router = APIRouter()


@router.get("/health")
def health():
    return {"ok": True, "service": "eda-builder", "phase": 2, "capabilities": phase2_capabilities()}
