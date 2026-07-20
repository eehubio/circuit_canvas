import type {
  CreateEdaBuilderJobRequest,
  EdaArtifactBundle,
  EdaAssetDraft,
  EdaBuilderJob,
  EdaBuilderJobEvent,
  EdaBuilderJobStatus,
  EdaBuilderProvider,
  EdaPackageFamily,
  EdaPinDefinition,
  PublishEdaBuilderJobRequest,
  PublishEdaBuilderJobResult,
} from '../types/eda-builder';

interface StoredJob {
  job: EdaBuilderJob;
  draft: EdaAssetDraft;
  events: EdaBuilderJobEvent[];
  artifacts?: EdaArtifactBundle;
  ticks: number;
  scenario: NonNullable<CreateEdaBuilderJobRequest['mockScenario']>;
}

const STORAGE_KEY = 'cc_eda_builder_jobs_v01';

const now = () => new Date().toISOString();

const pinTypeFor = (name: string): EdaPinDefinition['type'] => {
  const upper = name.toUpperCase();
  if (/^(VCC|VDD|VIN|V\+|VREF|VBAT|AVDD|DVDD)$/.test(upper)) return 'power_in';
  if (/^(GND|VSS|AGND|DGND|PGND|V-)$/.test(upper)) return 'power_in';
  if (/^(OUT|OUTA|OUTB|VO|VOUT|SW)$/.test(upper)) return 'output';
  if (/^(SDA|SCL|IO|GPIO|DIO)/.test(upper)) return 'bidirectional';
  if (/^(NC|N\.C\.)$/.test(upper)) return 'no_connect';
  return 'input';
};

const defaultPins = (mpn: string): EdaPinDefinition[] => {
  const names = /358/i.test(mpn)
    ? ['OUTA', 'INA-', 'INA+', 'V-', 'INB+', 'INB-', 'OUTB', 'V+']
    : ['VIN', 'GND', 'EN', 'NC', 'VOUT'];
  return names.map((name, index) => ({
    id: `pin_${index + 1}`,
    number: String(index + 1),
    rawName: name,
    name,
    type: pinTypeFor(name),
    description: name === 'NC' ? 'No connect' : `${name} pin`,
    side: pinTypeFor(name) === 'output' ? 'right' : pinTypeFor(name) === 'power_in' && /GND|V-|VSS/.test(name) ? 'bottom' : pinTypeFor(name) === 'power_in' ? 'top' : 'left',
    confidence: index === 3 ? 0.72 : 0.9,
    evidenceIds: ['ev_pin_table'],
  }));
};

const inferFamily = (pinCount: number, mpn: string): EdaPackageFamily => {
  const upper = mpn.toUpperCase();
  if (/QFN|DFN/.test(upper)) return 'QFN';
  if (/LQFP|TQFP|QFP/.test(upper)) return 'LQFP';
  if (/SOT/.test(upper) || pinCount <= 5) return 'SOT';
  return 'SOIC';
};

const footprintNameFor = (family: EdaPackageFamily, pinCount: number) => {
  if (family === 'SOT' && pinCount === 5) return 'SOT-23-5';
  if (family === 'LQFP') return `LQFP-${pinCount}`;
  if (family === 'QFN') return `QFN-${pinCount}`;
  return `SOIC-${pinCount}`;
};

const createDraft = (req: CreateEdaBuilderJobRequest): EdaAssetDraft => {
  const mpn = req.source.mpn || req.source.componentId || 'LM358DR';
  const pins = defaultPins(mpn);
  const family = inferFamily(pins.length, mpn);
  return {
    schemaVersion: '0.1',
    source: req.source,
    component: {
      mpn,
      manufacturer: /358/i.test(mpn) ? 'Texas Instruments' : 'Mock Semiconductor',
      description: /358/i.test(mpn) ? 'Dual operational amplifier' : 'Datasheet extracted component draft',
      category: /LDO|REG|1117|SOT/i.test(mpn) ? 'power' : 'ic',
    },
    pins,
    packageVariants: [{
      id: 'pkg_default',
      rawName: footprintNameFor(family, pins.length),
      family,
      pinCount: pins.length,
      body: { widthMm: family === 'SOT' ? 1.6 : 3.9, lengthMm: family === 'SOT' ? 2.9 : 4.9, heightMm: 1.2 },
      pitchMm: family === 'SOT' ? 0.95 : 1.27,
      pin1Location: 'top_left',
      confidence: 0.82,
      evidenceIds: ['ev_pkg_table'],
    }],
    selectedPackageVariantId: 'pkg_default',
    requestedArtifacts: req.requestedArtifacts,
    evidence: [
      { id: 'ev_pin_table', page: 4, type: 'table_row', rawText: 'Pin description table candidate', sourceStage: 'pin_package_extraction', confidence: 0.86 },
      { id: 'ev_pkg_table', page: 22, type: 'text', rawText: 'Package information / mechanical data candidate', sourceStage: 'package_extraction', confidence: 0.78 },
    ],
    reviewItems: [
      {
        id: 'rev_pin1',
        severity: 'warning',
        path: '/packageVariants/0/pin1Location',
        title: 'Pin 1 位置需要确认',
        message: '封装图和表格均给出 Pin 1 线索，但置信度未达到自动发布阈值。',
        suggestedValue: 'top_left',
        evidenceIds: ['ev_pkg_table'],
        resolved: false,
      },
    ],
    resolved: false,
  };
};

const eventFor = (job: EdaBuilderJob, message = job.message): EdaBuilderJobEvent => ({
  id: `evt_${Math.random().toString(36).slice(2, 9)}`,
  jobId: job.jobId,
  status: job.status,
  progress: job.progress,
  message,
  at: now(),
});

const stageMessages: Partial<Record<EdaBuilderJobStatus, string>> = {
  queued: 'Job queued',
  ingesting: 'Validating source and checking existing ezPLM assets',
  parsing_pdf: 'Parsing PDF text layer',
  extracting_pins: 'Extracting pin table and package variants',
  review_required: 'Review required before generation',
};

const generatedSymbol = (draft: EdaAssetDraft): string => {
  const mpn = draft.component.mpn.replace(/[^A-Za-z0-9_]/g, '_') || 'GeneratedPart';
  const pins = draft.pins.map((pin, index) => {
    const y = (index - (draft.pins.length - 1) / 2) * 2.54;
    const left = pin.side !== 'right';
    const x = left ? -7.62 : 7.62;
    const angle = left ? 0 : 180;
    return `      (pin ${pin.type} line (at ${x.toFixed(2)} ${y.toFixed(2)} ${angle}) (length 2.54) (name "${pin.name}") (number "${pin.number}"))`;
  });
  return [
    '(kicad_symbol_lib (version 20231120) (generator "circuit-canvas-eda-asset-builder")',
    `  (symbol "${mpn}"`,
    '    (property "Reference" "U" (at 0 8 0))',
    `    (property "Value" "${draft.component.mpn}" (at 0 -8 0))`,
    `    (symbol "${mpn}_1_1"`,
    '      (rectangle (start -5.08 7.62) (end 5.08 -7.62))',
    ...pins,
    '    )',
    '  )',
    ')',
  ].join('\n');
};

const generatedFootprint = (draft: EdaAssetDraft): string => {
  const pkg = draft.packageVariants.find((p) => p.id === draft.selectedPackageVariantId) ?? draft.packageVariants[0];
  const name = pkg?.rawName || `SOIC-${draft.pins.length}`;
  const perSide = Math.ceil(draft.pins.length / 2);
  const pitch = pkg?.pitchMm ?? 1.27;
  const rowGap = Math.max(4.6, (pkg?.body.widthMm ?? 3.9) + 1.5);
  const y0 = -((perSide - 1) * pitch) / 2;
  const pads = draft.pins.map((pin, index) => {
    const left = index < perSide;
    const rowIndex = left ? index : draft.pins.length - 1 - index;
    const x = left ? -rowGap / 2 : rowGap / 2;
    const y = y0 + rowIndex * pitch;
    return `  (pad "${pin.number}" smd roundrect (at ${x.toFixed(3)} ${y.toFixed(3)}) (size 1.5 0.6) (layers "F.Cu" "F.Paste" "F.Mask"))`;
  });
  return [
    `(footprint "${name}"`,
    '  (version 20240108)',
    '  (generator "circuit-canvas-eda-asset-builder")',
    '  (fp_rect (start -2.45 -1.95) (end 2.45 1.95) (stroke (width 0.1) (type solid)) (fill none) (layer "F.Fab"))',
    ...pads,
    ')',
  ].join('\n');
};

const symbolPreview = (draft: EdaAssetDraft): string => {
  const rows = draft.pins.map((pin) => `<text x="${pin.side === 'right' ? 168 : 32}" y="${30 + Number(pin.number) * 14}" text-anchor="${pin.side === 'right' ? 'end' : 'start'}">${pin.number} ${pin.name}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="160" viewBox="0 0 200 160"><rect x="55" y="18" width="90" height="124" rx="8" fill="#f8fafc" stroke="#64748b"/><text x="100" y="84" text-anchor="middle" font-family="monospace" font-size="13">${draft.component.mpn}</text>${rows}</svg>`;
};

const artifactFrom = (job: EdaBuilderJob, draft: EdaAssetDraft): EdaArtifactBundle => {
  const pkg = draft.packageVariants.find((p) => p.id === draft.selectedPackageVariantId) ?? draft.packageVariants[0];
  const footprintName = pkg?.rawName || `SOIC-${draft.pins.length}`;
  const warnings = draft.reviewItems.filter((item) => !item.resolved).map((item) => item.title);
  return {
    jobId: job.jobId,
    mpn: draft.component.mpn,
    manufacturer: draft.component.manufacturer,
    category: draft.component.category,
    description: draft.component.description,
    footprintName,
    pins: draft.pins.length,
    symbol: draft.requestedArtifacts.symbol9 ? {
      name: `${draft.component.mpn}.kicad_sym`,
      mimeType: 'text/plain',
      text: generatedSymbol(draft),
      validationStatus: 'passed',
      warnings: [],
    } : undefined,
    symbol10: draft.requestedArtifacts.symbol10 ? {
      name: `${draft.component.mpn}.kicad10.kicad_sym`,
      mimeType: 'text/plain',
      text: generatedSymbol(draft),
      validationStatus: 'not_run',
      warnings: ['KiCad 10 CLI not available in browser mock'],
    } : undefined,
    footprint: draft.requestedArtifacts.footprint ? {
      name: `${footprintName}.kicad_mod`,
      mimeType: 'text/plain',
      text: generatedFootprint(draft),
      validationStatus: 'passed',
      warnings: [],
    } : undefined,
    step: draft.requestedArtifacts.step ? {
      name: `${draft.component.mpn}.step`,
      mimeType: 'model/step',
      url: `/generated-assets/${encodeURIComponent(job.jobId)}/${encodeURIComponent(draft.component.mpn)}.step`,
      validationStatus: 'not_run',
      warnings: ['Mock flow only registers a future STEP URL; CAD generation is a service-stage responsibility'],
    } : undefined,
    manifest: {
      schemaVersion: '0.1',
      generatedAt: now(),
      validationStatus: warnings.length ? 'not_run' : 'passed',
      warnings,
    },
    preview: { symbolSvg: symbolPreview(draft) },
  };
};

export class MockEdaBuilderProvider implements EdaBuilderProvider {
  private jobs = new Map<string, StoredJob>();

  constructor() {
    this.load();
  }

  async createJob(req: CreateEdaBuilderJobRequest): Promise<EdaBuilderJob> {
    const at = now();
    const job: EdaBuilderJob = {
      jobId: `eda_${Math.random().toString(36).slice(2, 10)}`,
      status: req.mockScenario === 'failed' ? 'failed' : req.mockScenario === 'completed' ? 'completed' : 'queued',
      progress: req.mockScenario === 'completed' ? 100 : req.mockScenario === 'failed' ? 100 : 5,
      message: req.mockScenario === 'failed' ? 'Mock failure requested' : req.mockScenario === 'completed' ? 'Mock job completed' : 'Job queued',
      source: req.source,
      requestedArtifacts: req.requestedArtifacts,
      mode: req.mode,
      createdAt: at,
      updatedAt: at,
      stages: [],
      warnings: [],
      error: req.mockScenario === 'failed' ? 'Mock extraction failed for demonstration' : undefined,
    };
    const draft = createDraft(req);
    if (req.mockScenario === 'completed') draft.resolved = true;
    const stored: StoredJob = {
      job,
      draft,
      events: [eventFor(job)],
      ticks: 0,
      scenario: req.mockScenario ?? 'review_required',
      artifacts: req.mockScenario === 'completed' ? artifactFrom(job, draft) : undefined,
    };
    this.jobs.set(job.jobId, stored);
    this.save();
    return job;
  }

  async getJob(jobId: string): Promise<EdaBuilderJob> {
    const stored = this.must(jobId);
    if (!['failed', 'cancelled', 'review_required', 'ready_to_generate', 'completed'].includes(stored.job.status)) {
      this.advance(stored);
    }
    this.save();
    return stored.job;
  }

  async getEvents(jobId: string): Promise<EdaBuilderJobEvent[]> {
    return [...this.must(jobId).events];
  }

  async getDraft(jobId: string): Promise<EdaAssetDraft> {
    return structuredClone(this.must(jobId).draft);
  }

  async patchDraft(jobId: string, patch: Partial<EdaAssetDraft>): Promise<EdaAssetDraft> {
    const stored = this.must(jobId);
    stored.draft = {
      ...stored.draft,
      ...patch,
      component: { ...stored.draft.component, ...patch.component },
      source: { ...stored.draft.source, ...patch.source },
      requestedArtifacts: { ...stored.draft.requestedArtifacts, ...patch.requestedArtifacts },
    };
    stored.draft.resolved = stored.draft.reviewItems.every((item) => item.resolved);
    if (stored.job.status === 'review_required' && stored.draft.resolved) {
      this.setStatus(stored, 'ready_to_generate', 58, 'Draft resolved and ready to generate');
    }
    this.save();
    return structuredClone(stored.draft);
  }

  async generate(jobId: string): Promise<EdaBuilderJob> {
    const stored = this.must(jobId);
    if (stored.job.status === 'failed' || stored.job.status === 'cancelled') return stored.job;
    const steps: [EdaBuilderJobStatus, number, string][] = [
      ['generating_symbol', 66, 'Generating KiCad symbol'],
      ['matching_footprint', 74, 'Matching footprint candidates'],
      ['generating_footprint', 82, 'Generating fallback footprint'],
      ['matching_model', 88, 'Matching STEP/VRML model'],
      ['validating', 94, 'Running static validation'],
      ['completed', 100, 'Artifact bundle completed'],
    ];
    for (const [status, progress, message] of steps) this.setStatus(stored, status, progress, message);
    stored.draft.resolved = true;
    stored.draft.reviewItems = stored.draft.reviewItems.map((item) => ({ ...item, resolved: true }));
    stored.artifacts = artifactFrom(stored.job, stored.draft);
    this.save();
    return stored.job;
  }

  async getArtifacts(jobId: string): Promise<EdaArtifactBundle> {
    const stored = this.must(jobId);
    if (!stored.artifacts) stored.artifacts = artifactFrom(stored.job, stored.draft);
    this.save();
    return structuredClone(stored.artifacts);
  }

  async publish(jobId: string, req: PublishEdaBuilderJobRequest): Promise<PublishEdaBuilderJobResult> {
    this.must(jobId);
    return {
      ok: true,
      target: req.target,
      message: req.target === 'ezplm' ? 'Mock publish recorded; production requires explicit ezPLM writeback API' : 'Mock publish completed',
    };
  }

  async cancel(jobId: string): Promise<EdaBuilderJob> {
    const stored = this.must(jobId);
    this.setStatus(stored, 'cancelled', stored.job.progress, 'Job cancelled');
    this.save();
    return stored.job;
  }

  private advance(stored: StoredJob) {
    if (stored.scenario === 'failed') {
      this.setStatus(stored, 'failed', 100, 'Mock extraction failed');
      stored.job.error = 'Mock extraction failed for demonstration';
      return;
    }
    const timeline: [EdaBuilderJobStatus, number][] = [
      ['queued', 8],
      ['ingesting', 18],
      ['parsing_pdf', 32],
      ['extracting_pins', 46],
      ['review_required', 55],
    ];
    const [status, progress] = timeline[Math.min(stored.ticks, timeline.length - 1)];
    stored.ticks += 1;
    this.setStatus(stored, status, progress, stageMessages[status] ?? status);
  }

  private setStatus(stored: StoredJob, status: EdaBuilderJobStatus, progress: number, message: string) {
    stored.job.status = status;
    stored.job.progress = progress;
    stored.job.message = message;
    stored.job.updatedAt = now();
    stored.job.stages.push({
      status,
      progress,
      message,
      startedAt: stored.job.updatedAt,
      completedAt: status === 'completed' || status === 'failed' || status === 'cancelled' ? stored.job.updatedAt : undefined,
    });
    stored.events.push(eventFor(stored.job, message));
  }

  private must(jobId: string): StoredJob {
    const stored = this.jobs.get(jobId);
    if (!stored) throw new Error(`EDA Builder job not found: ${jobId}`);
    return stored;
  }

  private load() {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredJob[];
      parsed.forEach((entry) => this.jobs.set(entry.job.jobId, entry));
    } catch {
      this.jobs.clear();
    }
  }

  private save() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...this.jobs.values()].slice(-20)));
    } catch {
      // localStorage may be unavailable or full; mock still works in memory.
    }
  }
}
