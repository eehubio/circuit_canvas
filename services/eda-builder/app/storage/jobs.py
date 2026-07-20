from datetime import datetime, timezone, timedelta
from pathlib import Path
from uuid import uuid4
import json

from app.domain.artifact import EdaArtifactBundle, EdaArtifactManifest
from app.domain.draft import (
    EdaAssetDraft,
    EdaComponentIdentity,
    EdaReviewItem,
)
from app.domain.job import (
    CreateEdaBuilderJobRequest,
    EdaBuilderJob,
    EdaBuilderJobEvent,
    EdaBuilderJobStage,
    JobStatus,
)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:12]}"


class JobNotFound(KeyError):
    pass


class JobStore:
    def __init__(self, root: Path):
        self.root = root
        self.jobs_dir = root / "jobs"
        self.uploads_dir = root / "uploads"
        self.idempotency_path = root / "idempotency.json"
        self.jobs_dir.mkdir(parents=True, exist_ok=True)
        self.uploads_dir.mkdir(parents=True, exist_ok=True)

    def create_upload(self) -> dict:
        upload_id = new_id("upl")
        target = self.uploads_dir / upload_id
        target.mkdir(parents=True, exist_ok=True)
        return {
            "uploadId": upload_id,
            "uploadUrl": f"local://uploads/{upload_id}",
            "expiresAt": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat().replace("+00:00", "Z"),
        }

    def create_job(self, req: CreateEdaBuilderJobRequest, idempotency_key: str | None = None) -> EdaBuilderJob:
        if idempotency_key:
            found = self.lookup_idempotency(idempotency_key)
            if found:
                return self.get_job(found)

        at = utc_now()
        job = EdaBuilderJob(
            jobId=new_id("eda"),
            status="review_required",
            progress=50,
            message="Phase 2 skeleton created a draft; extraction pipeline is not implemented yet",
            source=req.source,
            requestedArtifacts=req.requestedArtifacts,
            mode=req.mode,
            createdAt=at,
            updatedAt=at,
            warnings=["PDF extraction and KiCad generation are intentionally not implemented in Phase 2"],
        )
        job.stages.append(EdaBuilderJobStage(
            status="building_draft",
            progress=50,
            message="Created placeholder draft without parsing PDF/OCR/CAD",
            startedAt=at,
            completedAt=at,
            warnings=job.warnings,
        ))
        draft = self.initial_draft(req)
        bundle = self.empty_artifacts(job, draft)
        self.write_job(job)
        self.write_draft(job.jobId, draft)
        self.write_events(job.jobId, [self.event_for(job)])
        self.write_artifacts(job.jobId, bundle)
        if idempotency_key:
            self.remember_idempotency(idempotency_key, job.jobId)
        return job

    def initial_draft(self, req: CreateEdaBuilderJobRequest) -> EdaAssetDraft:
        mpn = req.source.mpn or req.source.componentId or "UNKNOWN"
        return EdaAssetDraft(
            source=req.source,
            component=EdaComponentIdentity(mpn=mpn, category="unknown"),
            requestedArtifacts=req.requestedArtifacts,
            reviewItems=[
                EdaReviewItem(
                    id="rev_phase2_extraction_not_implemented",
                    severity="blocking",
                    path="/pins",
                    title="Extraction pipeline not implemented",
                    message="Phase 2 only stores jobs/drafts/events/artifacts. PDF parsing, pin extraction, and generation start in later phases.",
                    resolved=False,
                )
            ],
            resolved=False,
        )

    def empty_artifacts(self, job: EdaBuilderJob, draft: EdaAssetDraft) -> EdaArtifactBundle:
        return EdaArtifactBundle(
            jobId=job.jobId,
            mpn=draft.component.mpn,
            manufacturer=draft.component.manufacturer,
            category=draft.component.category,
            description=draft.component.description,
            footprintName=None,
            pins=len(draft.pins),
            manifest=EdaArtifactManifest(
                generatedAt=utc_now(),
                validationStatus="not_run",
                warnings=[
                    "No generated files are returned in Phase 2",
                    "Generation service stage is not implemented",
                ],
            ),
        )

    def get_job(self, job_id: str) -> EdaBuilderJob:
        return EdaBuilderJob.model_validate(self.read_json(self.job_dir(job_id) / "job.json"))

    def get_draft(self, job_id: str) -> EdaAssetDraft:
        return EdaAssetDraft.model_validate(self.read_json(self.job_dir(job_id) / "draft.json"))

    def patch_draft(self, job_id: str, patch: dict) -> EdaAssetDraft:
        draft_data = self.get_draft(job_id).model_dump(mode="json")
        merged = self.deep_merge(draft_data, patch)
        draft = EdaAssetDraft.model_validate(merged)
        draft.resolved = bool(draft.resolved or (draft.pins and draft.packageVariants and all(item.resolved for item in draft.reviewItems)))
        self.write_draft(job_id, draft)

        job = self.get_job(job_id)
        if draft.resolved and job.status == "review_required":
            self.update_job(job_id, "ready_to_generate", 60, "Draft resolved; generation stage is still not implemented")
        return draft

    def get_events(self, job_id: str) -> list[EdaBuilderJobEvent]:
        data = self.read_json(self.job_dir(job_id) / "events.json")
        return [EdaBuilderJobEvent.model_validate(item) for item in data]

    def get_artifacts(self, job_id: str) -> EdaArtifactBundle:
        return EdaArtifactBundle.model_validate(self.read_json(self.job_dir(job_id) / "artifacts" / "manifest.json"))

    def generate(self, job_id: str) -> EdaBuilderJob:
        job = self.get_job(job_id)
        if job.status == "cancelled":
            return job
        job.status = "failed"
        job.progress = 100
        job.message = "Generation is not implemented in Phase 2"
        job.error = "GENERATION_NOT_IMPLEMENTED"
        job.updatedAt = utc_now()
        job.stages.append(EdaBuilderJobStage(
            status="failed",
            progress=100,
            message=job.message,
            startedAt=job.updatedAt,
            completedAt=job.updatedAt,
            warnings=["Symbol, footprint, STEP, and VRML generation start in later phases"],
        ))
        self.write_job(job)
        self.append_event(job)
        draft = self.get_draft(job_id)
        self.write_artifacts(job_id, self.empty_artifacts(job, draft))
        return job

    def cancel(self, job_id: str) -> EdaBuilderJob:
        return self.update_job(job_id, "cancelled", self.get_job(job_id).progress, "Job cancelled")

    def update_job(self, job_id: str, status: JobStatus, progress: int, message: str) -> EdaBuilderJob:
        job = self.get_job(job_id)
        job.status = status
        job.progress = progress
        job.message = message
        job.updatedAt = utc_now()
        job.stages.append(EdaBuilderJobStage(status=status, progress=progress, message=message, startedAt=job.updatedAt))
        self.write_job(job)
        self.append_event(job)
        return job

    def event_for(self, job: EdaBuilderJob) -> EdaBuilderJobEvent:
        return EdaBuilderJobEvent(
            id=new_id("evt"),
            jobId=job.jobId,
            status=job.status,
            progress=job.progress,
            message=job.message,
            at=utc_now(),
            warnings=job.warnings,
        )

    def append_event(self, job: EdaBuilderJob) -> None:
        events = self.get_events(job.jobId)
        events.append(self.event_for(job))
        self.write_events(job.jobId, events)

    def job_dir(self, job_id: str) -> Path:
        if not job_id.startswith("eda_") or "/" in job_id or "\\" in job_id:
            raise JobNotFound(job_id)
        path = self.jobs_dir / job_id
        if not path.exists():
            raise JobNotFound(job_id)
        return path

    def ensure_job_dir(self, job_id: str) -> Path:
        path = self.jobs_dir / job_id
        path.mkdir(parents=True, exist_ok=True)
        (path / "artifacts").mkdir(exist_ok=True)
        return path

    def write_job(self, job: EdaBuilderJob) -> None:
        path = self.ensure_job_dir(job.jobId)
        self.write_json(path / "job.json", job.model_dump(mode="json"))

    def write_draft(self, job_id: str, draft: EdaAssetDraft) -> None:
        path = self.ensure_job_dir(job_id)
        self.write_json(path / "draft.json", draft.model_dump(mode="json"))

    def write_events(self, job_id: str, events: list[EdaBuilderJobEvent]) -> None:
        path = self.ensure_job_dir(job_id)
        self.write_json(path / "events.json", [event.model_dump(mode="json") for event in events])

    def write_artifacts(self, job_id: str, bundle: EdaArtifactBundle) -> None:
        path = self.ensure_job_dir(job_id) / "artifacts"
        self.write_json(path / "manifest.json", bundle.model_dump(mode="json"))

    def lookup_idempotency(self, key: str) -> str | None:
        data = self.read_json(self.idempotency_path, default={})
        return data.get(key)

    def remember_idempotency(self, key: str, job_id: str) -> None:
        data = self.read_json(self.idempotency_path, default={})
        data[key] = job_id
        self.write_json(self.idempotency_path, data)

    @staticmethod
    def deep_merge(base: dict, patch: dict) -> dict:
        out = dict(base)
        for key, value in patch.items():
            if isinstance(value, dict) and isinstance(out.get(key), dict):
                out[key] = JobStore.deep_merge(out[key], value)
            else:
                out[key] = value
        return out

    @staticmethod
    def read_json(path: Path, default=None):
        if not path.exists():
            if default is not None:
                return default
            raise JobNotFound(str(path))
        return json.loads(path.read_text(encoding="utf-8"))

    @staticmethod
    def write_json(path: Path, data) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(path.suffix + ".tmp")
        tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        tmp.replace(path)
