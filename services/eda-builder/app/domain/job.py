from typing import Literal
from pydantic import BaseModel, Field
from .draft import EdaRequestedArtifacts, EdaSource


JobStatus = Literal[
    "created",
    "uploading",
    "queued",
    "ingesting",
    "parsing_pdf",
    "locating_sections",
    "extracting_pins",
    "extracting_packages",
    "building_draft",
    "review_required",
    "ready_to_generate",
    "generating_symbol",
    "matching_footprint",
    "generating_footprint",
    "matching_model",
    "generating_model",
    "validating",
    "completed",
    "failed",
    "cancelled",
]


class EdaBuilderJobStage(BaseModel):
    status: JobStatus
    progress: int = 0
    message: str
    startedAt: str
    completedAt: str | None = None
    warnings: list[str] = Field(default_factory=list)


class EdaBuilderJob(BaseModel):
    jobId: str
    status: JobStatus
    progress: int
    message: str
    source: EdaSource
    requestedArtifacts: EdaRequestedArtifacts
    mode: Literal["missing_only", "force_all"] = "missing_only"
    createdAt: str
    updatedAt: str
    stages: list[EdaBuilderJobStage] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    error: str | None = None


class EdaBuilderJobEvent(BaseModel):
    id: str
    jobId: str
    status: JobStatus
    progress: int
    message: str
    at: str
    warnings: list[str] = Field(default_factory=list)


class CreateEdaBuilderJobRequest(BaseModel):
    source: EdaSource
    requestedArtifacts: EdaRequestedArtifacts = Field(default_factory=EdaRequestedArtifacts)
    mode: Literal["missing_only", "force_all"] = "missing_only"


class PublishEdaBuilderJobRequest(BaseModel):
    target: Literal["canvas", "download", "ezplm"]


class PublishEdaBuilderJobResult(BaseModel):
    ok: bool
    target: Literal["canvas", "download", "ezplm"]
    message: str
