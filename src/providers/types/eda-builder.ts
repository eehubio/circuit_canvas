import type { ComponentCategory } from '../../design-core/document/types';

export type EdaAssetSourceType = 'pdf_upload' | 'pdf_url' | 'ezplm_component' | 'manual';
export type EdaArtifactKind = 'symbol9' | 'symbol10' | 'footprint' | 'step' | 'vrml';

export type EdaPinType =
  | 'input'
  | 'output'
  | 'bidirectional'
  | 'tri_state'
  | 'passive'
  | 'power_in'
  | 'power_out'
  | 'open_collector'
  | 'open_emitter'
  | 'no_connect'
  | 'unspecified';

export type EdaPackageFamily =
  | 'DIP'
  | 'SOIC'
  | 'TSSOP'
  | 'MSOP'
  | 'QFN'
  | 'DFN'
  | 'QFP'
  | 'LQFP'
  | 'TQFP'
  | 'SOT'
  | 'BGA'
  | 'CHIP'
  | 'CUSTOM';

export interface EdaRequestedArtifacts {
  symbol9: boolean;
  symbol10: boolean;
  footprint: boolean;
  step: boolean;
  vrml: boolean;
}

export interface EdaSource {
  type: EdaAssetSourceType;
  documentId?: string;
  uploadId?: string;
  componentId?: string;
  mpn?: string;
  sourceUrl?: string;
  sha256?: string;
  pastedText?: string;
}

export interface EdaPinDefinition {
  id: string;
  number: string;
  rawName: string;
  name: string;
  type: EdaPinType;
  description?: string;
  side?: 'left' | 'right' | 'top' | 'bottom';
  unit?: string;
  hidden?: boolean;
  alternateFunctions?: string[];
  confidence: number;
  evidenceIds: string[];
}

export interface EdaPackageVariant {
  id: string;
  rawName: string;
  family: EdaPackageFamily;
  manufacturerCode?: string;
  pinCount: number;
  body: {
    widthMm?: number;
    lengthMm?: number;
    heightMm?: number;
  };
  pitchMm?: number;
  lead?: {
    widthMm?: number;
    lengthMm?: number;
    spanMm?: number;
  };
  exposedPad?: {
    number?: string;
    widthMm?: number;
    lengthMm?: number;
  };
  pin1Location?: 'top_left' | 'top' | 'left' | 'unknown';
  confidence: number;
  evidenceIds: string[];
}

export interface EvidenceAnchor {
  id: string;
  page: number;
  bbox?: [number, number, number, number];
  type: 'text' | 'table_row' | 'table_cell' | 'figure' | 'manual';
  rawText?: string;
  cropUrl?: string;
  sourceStage: string;
  confidence: number;
}

export interface EdaReviewItem {
  id: string;
  severity: 'info' | 'warning' | 'blocking';
  path: string;
  title: string;
  message: string;
  suggestedValue?: unknown;
  evidenceIds: string[];
  resolved: boolean;
}

export interface EdaAssetDraft {
  schemaVersion: '0.1';
  source: EdaSource;
  component: {
    mpn: string;
    manufacturer?: string;
    description?: string;
    category: ComponentCategory | 'unknown';
  };
  pins: EdaPinDefinition[];
  packageVariants: EdaPackageVariant[];
  selectedPackageVariantId?: string;
  requestedArtifacts: EdaRequestedArtifacts;
  evidence: EvidenceAnchor[];
  reviewItems: EdaReviewItem[];
  resolved: boolean;
}

export type EdaBuilderJobStatus =
  | 'created'
  | 'uploading'
  | 'queued'
  | 'ingesting'
  | 'parsing_pdf'
  | 'locating_sections'
  | 'extracting_pins'
  | 'extracting_packages'
  | 'building_draft'
  | 'review_required'
  | 'ready_to_generate'
  | 'generating_symbol'
  | 'matching_footprint'
  | 'generating_footprint'
  | 'matching_model'
  | 'generating_model'
  | 'validating'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface EdaBuilderJobStage {
  status: EdaBuilderJobStatus;
  progress: number;
  message: string;
  startedAt: string;
  completedAt?: string;
  warnings?: string[];
}

export interface EdaBuilderJob {
  jobId: string;
  status: EdaBuilderJobStatus;
  progress: number;
  message: string;
  source: EdaSource;
  requestedArtifacts: EdaRequestedArtifacts;
  mode: 'missing_only' | 'force_all';
  createdAt: string;
  updatedAt: string;
  stages: EdaBuilderJobStage[];
  warnings: string[];
  error?: string;
}

export interface EdaBuilderJobEvent {
  id: string;
  jobId: string;
  status: EdaBuilderJobStatus;
  progress: number;
  message: string;
  at: string;
  warnings?: string[];
}

export interface EdaExistingAssetState {
  datasheet: boolean;
  pinData: boolean;
  symbol: boolean;
  footprint: boolean;
  step: boolean;
  vrml: boolean;
}

export interface CreateEdaBuilderJobRequest {
  source: EdaSource;
  requestedArtifacts: EdaRequestedArtifacts;
  mode: 'missing_only' | 'force_all';
  existingAssets?: Partial<EdaExistingAssetState>;
  mockScenario?: 'running' | 'review_required' | 'completed' | 'failed';
}

export interface EdaGeneratedFile {
  name: string;
  mimeType: string;
  text?: string;
  url?: string;
  bytesBase64?: string;
  validationStatus: 'passed' | 'failed' | 'not_run';
  warnings: string[];
}

export interface EdaArtifactBundle {
  jobId: string;
  mpn: string;
  manufacturer?: string;
  category: ComponentCategory | 'unknown';
  description?: string;
  footprintName?: string;
  pins: number;
  symbol?: EdaGeneratedFile;
  symbol10?: EdaGeneratedFile;
  footprint?: EdaGeneratedFile;
  step?: EdaGeneratedFile;
  vrml?: EdaGeneratedFile;
  manifest: {
    schemaVersion: '0.1';
    generatedAt: string;
    validationStatus: 'passed' | 'failed' | 'not_run';
    warnings: string[];
  };
  preview?: {
    symbolSvg?: string;
    footprintSvg?: string;
    modelImage?: string;
  };
}

export interface PublishEdaBuilderJobRequest {
  target: 'canvas' | 'download' | 'ezplm';
}

export interface PublishEdaBuilderJobResult {
  ok: boolean;
  target: PublishEdaBuilderJobRequest['target'];
  message: string;
}

export interface EdaBuilderProvider {
  createJob(req: CreateEdaBuilderJobRequest): Promise<EdaBuilderJob>;
  getJob(jobId: string): Promise<EdaBuilderJob>;
  getEvents(jobId: string): Promise<EdaBuilderJobEvent[]>;
  getDraft(jobId: string): Promise<EdaAssetDraft>;
  patchDraft(jobId: string, patch: Partial<EdaAssetDraft>): Promise<EdaAssetDraft>;
  generate(jobId: string): Promise<EdaBuilderJob>;
  getArtifacts(jobId: string): Promise<EdaArtifactBundle>;
  publish(jobId: string, req: PublishEdaBuilderJobRequest): Promise<PublishEdaBuilderJobResult>;
  cancel(jobId: string): Promise<EdaBuilderJob>;
}
