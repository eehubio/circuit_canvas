from fastapi import APIRouter, Depends
from app.storage import get_job_store
from app.storage.jobs import JobStore

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.post("")
def create_upload(store: JobStore = Depends(get_job_store)):
    return store.create_upload()
