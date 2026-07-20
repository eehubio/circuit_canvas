from app.config import get_settings
from .jobs import JobStore


def get_job_store() -> JobStore:
    return JobStore(get_settings().data_dir)
