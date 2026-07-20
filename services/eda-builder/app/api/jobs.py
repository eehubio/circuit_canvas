from fastapi import APIRouter, Depends, Header

from app.api.errors import not_found
from app.domain.draft import EdaAssetDraft
from app.domain.job import (
    CreateEdaBuilderJobRequest,
    EdaBuilderJob,
    EdaBuilderJobEvent,
    PublishEdaBuilderJobRequest,
    PublishEdaBuilderJobResult,
)
from app.domain.artifact import EdaArtifactBundle
from app.storage import get_job_store
from app.storage.jobs import JobNotFound, JobStore

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post("", response_model=EdaBuilderJob)
def create_job(
    req: CreateEdaBuilderJobRequest,
    store: JobStore = Depends(get_job_store),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
):
    return store.create_job(req, idempotency_key=idempotency_key)


@router.get("/{job_id}", response_model=EdaBuilderJob)
def get_job(job_id: str, store: JobStore = Depends(get_job_store)):
    try:
        return store.get_job(job_id)
    except JobNotFound:
        raise not_found(job_id)


@router.get("/{job_id}/events", response_model=list[EdaBuilderJobEvent])
def get_events(job_id: str, store: JobStore = Depends(get_job_store)):
    try:
        return store.get_events(job_id)
    except JobNotFound:
        raise not_found(job_id)


@router.get("/{job_id}/draft", response_model=EdaAssetDraft)
def get_draft(job_id: str, store: JobStore = Depends(get_job_store)):
    try:
        return store.get_draft(job_id)
    except JobNotFound:
        raise not_found(job_id)


@router.patch("/{job_id}/draft", response_model=EdaAssetDraft)
def patch_draft(job_id: str, patch: dict, store: JobStore = Depends(get_job_store)):
    try:
        return store.patch_draft(job_id, patch)
    except JobNotFound:
        raise not_found(job_id)


@router.post("/{job_id}/generate", response_model=EdaBuilderJob)
def generate(job_id: str, store: JobStore = Depends(get_job_store)):
    try:
        return store.generate(job_id)
    except JobNotFound:
        raise not_found(job_id)


@router.get("/{job_id}/artifacts", response_model=EdaArtifactBundle)
def artifacts(job_id: str, store: JobStore = Depends(get_job_store)):
    try:
        return store.get_artifacts(job_id)
    except JobNotFound:
        raise not_found(job_id)


@router.post("/{job_id}/publish", response_model=PublishEdaBuilderJobResult)
def publish(job_id: str, req: PublishEdaBuilderJobRequest, store: JobStore = Depends(get_job_store)):
    try:
        store.get_job(job_id)
    except JobNotFound:
        raise not_found(job_id)
    if req.target == "ezplm":
        return PublishEdaBuilderJobResult(ok=False, target=req.target, message="ezPLM writeback is not implemented in Phase 2")
    return PublishEdaBuilderJobResult(ok=True, target=req.target, message="Publish acknowledged by Phase 2 service")


@router.post("/{job_id}/cancel", response_model=EdaBuilderJob)
def cancel(job_id: str, store: JobStore = Depends(get_job_store)):
    try:
        return store.cancel(job_id)
    except JobNotFound:
        raise not_found(job_id)
