from typing import Literal
from pydantic import BaseModel, Field


SourceType = Literal["pdf_upload", "pdf_url", "ezplm_component", "manual"]
ComponentCategory = Literal[
    "ic",
    "mcu",
    "power",
    "sensor",
    "connector",
    "passive",
    "rf",
    "electromech",
    "unknown",
]
PinType = Literal[
    "input",
    "output",
    "bidirectional",
    "tri_state",
    "passive",
    "power_in",
    "power_out",
    "open_collector",
    "open_emitter",
    "no_connect",
    "unspecified",
]
PackageFamily = Literal[
    "DIP",
    "SOIC",
    "TSSOP",
    "MSOP",
    "QFN",
    "DFN",
    "QFP",
    "LQFP",
    "TQFP",
    "SOT",
    "BGA",
    "CHIP",
    "CUSTOM",
]


class EdaRequestedArtifacts(BaseModel):
    symbol9: bool = True
    symbol10: bool = True
    footprint: bool = True
    step: bool = True
    vrml: bool = False


class EdaSource(BaseModel):
    type: SourceType
    documentId: str | None = None
    uploadId: str | None = None
    componentId: str | None = None
    mpn: str | None = None
    sourceUrl: str | None = None
    sha256: str | None = None
    pastedText: str | None = None


class EdaComponentIdentity(BaseModel):
    mpn: str
    manufacturer: str | None = None
    description: str | None = None
    category: ComponentCategory = "unknown"


class EdaPinDefinition(BaseModel):
    id: str
    number: str
    rawName: str
    name: str
    type: PinType = "unspecified"
    description: str | None = None
    side: Literal["left", "right", "top", "bottom"] | None = None
    unit: str | None = None
    hidden: bool = False
    alternateFunctions: list[str] = Field(default_factory=list)
    confidence: float = 0
    evidenceIds: list[str] = Field(default_factory=list)


class EdaPackageBody(BaseModel):
    widthMm: float | None = None
    lengthMm: float | None = None
    heightMm: float | None = None


class EdaPackageLead(BaseModel):
    widthMm: float | None = None
    lengthMm: float | None = None
    spanMm: float | None = None


class EdaExposedPad(BaseModel):
    number: str | None = None
    widthMm: float | None = None
    lengthMm: float | None = None


class EdaPackageVariant(BaseModel):
    id: str
    rawName: str
    family: PackageFamily
    manufacturerCode: str | None = None
    pinCount: int
    body: EdaPackageBody = Field(default_factory=EdaPackageBody)
    pitchMm: float | None = None
    lead: EdaPackageLead | None = None
    exposedPad: EdaExposedPad | None = None
    pin1Location: Literal["top_left", "top", "left", "unknown"] = "unknown"
    confidence: float = 0
    evidenceIds: list[str] = Field(default_factory=list)


class EvidenceAnchor(BaseModel):
    id: str
    page: int
    bbox: tuple[float, float, float, float] | None = None
    type: Literal["text", "table_row", "table_cell", "figure", "manual"]
    rawText: str | None = None
    cropUrl: str | None = None
    sourceStage: str
    confidence: float


class EdaReviewItem(BaseModel):
    id: str
    severity: Literal["info", "warning", "blocking"]
    path: str
    title: str
    message: str
    suggestedValue: object | None = None
    evidenceIds: list[str] = Field(default_factory=list)
    resolved: bool = False


class EdaAssetDraft(BaseModel):
    schemaVersion: Literal["0.1"] = "0.1"
    source: EdaSource
    component: EdaComponentIdentity
    pins: list[EdaPinDefinition] = Field(default_factory=list)
    packageVariants: list[EdaPackageVariant] = Field(default_factory=list)
    selectedPackageVariantId: str | None = None
    requestedArtifacts: EdaRequestedArtifacts = Field(default_factory=EdaRequestedArtifacts)
    evidence: list[EvidenceAnchor] = Field(default_factory=list)
    reviewItems: list[EdaReviewItem] = Field(default_factory=list)
    resolved: bool = False
