from typing import Literal
from pydantic import BaseModel, Field
from .draft import ComponentCategory


class EdaGeneratedFile(BaseModel):
    name: str
    mimeType: str
    text: str | None = None
    url: str | None = None
    bytesBase64: str | None = None
    validationStatus: Literal["passed", "failed", "not_run"] = "not_run"
    warnings: list[str] = Field(default_factory=list)


class EdaArtifactManifest(BaseModel):
    schemaVersion: Literal["0.1"] = "0.1"
    generatedAt: str
    validationStatus: Literal["passed", "failed", "not_run"] = "not_run"
    warnings: list[str] = Field(default_factory=list)


class EdaArtifactPreview(BaseModel):
    symbolSvg: str | None = None
    footprintSvg: str | None = None
    modelImage: str | None = None


class EdaArtifactBundle(BaseModel):
    jobId: str
    mpn: str
    manufacturer: str | None = None
    category: ComponentCategory = "unknown"
    description: str | None = None
    footprintName: str | None = None
    pins: int = 0
    symbol: EdaGeneratedFile | None = None
    symbol10: EdaGeneratedFile | None = None
    footprint: EdaGeneratedFile | None = None
    step: EdaGeneratedFile | None = None
    vrml: EdaGeneratedFile | None = None
    manifest: EdaArtifactManifest
    preview: EdaArtifactPreview | None = None
