import { describe, expect, it } from 'vitest';
import { MockEdaBuilderProvider } from '../MockEdaBuilderProvider';

const request = {
  source: { type: 'ezplm_component' as const, componentId: 'lm358', mpn: 'LM358DR' },
  requestedArtifacts: { symbol9: true, symbol10: true, footprint: true, step: false, vrml: false },
  mode: 'missing_only' as const,
};

describe('MockEdaBuilderProvider', () => {
  it('creates a job and advances to review_required', async () => {
    const provider = new MockEdaBuilderProvider();
    const job = await provider.createJob(request);

    let current = job;
    for (let i = 0; i < 6; i++) current = await provider.getJob(job.jobId);

    expect(current.status).toBe('review_required');
    expect(current.progress).toBeGreaterThan(50);
    expect((await provider.getDraft(job.jobId)).pins).toHaveLength(8);
  });

  it('generates a completed artifact bundle', async () => {
    const provider = new MockEdaBuilderProvider();
    const job = await provider.createJob(request);
    const draft = await provider.getDraft(job.jobId);
    await provider.patchDraft(job.jobId, {
      reviewItems: draft.reviewItems.map((item) => ({ ...item, resolved: true })),
    });

    const done = await provider.generate(job.jobId);
    const artifacts = await provider.getArtifacts(job.jobId);

    expect(done.status).toBe('completed');
    expect(artifacts.symbol?.text).toContain('kicad_symbol_lib');
    expect(artifacts.footprint?.text).toContain('(footprint "SOIC-8"');
  });
});
