import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpClient } from '../../http/client';
import { HttpEdaBuilderProvider } from '../HttpEdaBuilderProvider';

const jsonResponse = (body: unknown, init?: ResponseInit) => new Response(JSON.stringify(body), {
  status: 200,
  headers: { 'Content-Type': 'application/json' },
  ...init,
});

describe('HttpEdaBuilderProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts create job to the unified EDA Builder API', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ jobId: 'eda_1', status: 'review_required', progress: 50 }));
    vi.stubGlobal('fetch', fetchMock);
    const provider = new HttpEdaBuilderProvider(new HttpClient({ baseUrl: '/api' }));

    const job = await provider.createJob({
      source: { type: 'ezplm_component', componentId: 'lm358', mpn: 'LM358DR' },
      requestedArtifacts: { symbol9: true, symbol10: true, footprint: true, step: true, vrml: false },
      mode: 'missing_only',
    });

    expect(job.jobId).toBe('eda_1');
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/eda-builder/jobs', expect.objectContaining({ method: 'POST' }));
  });

  it('calls cancel endpoint for timeout/cancel flows', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ jobId: 'eda_1', status: 'cancelled', progress: 50 }));
    vi.stubGlobal('fetch', fetchMock);
    const provider = new HttpEdaBuilderProvider(new HttpClient({ baseUrl: '/api' }));

    const job = await provider.cancel('eda_1');

    expect(job.status).toBe('cancelled');
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/eda-builder/jobs/eda_1/cancel', expect.objectContaining({ method: 'POST' }));
  });
});
