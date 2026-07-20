import { HttpClient } from '../http/client';
import type {
  CreateEdaBuilderJobRequest,
  EdaArtifactBundle,
  EdaAssetDraft,
  EdaBuilderJob,
  EdaBuilderJobEvent,
  EdaBuilderProvider,
  PublishEdaBuilderJobRequest,
  PublishEdaBuilderJobResult,
} from '../types/eda-builder';

const BASE_PATH = '/v1/eda-builder';

export class HttpEdaBuilderProvider implements EdaBuilderProvider {
  constructor(private http: HttpClient) {}

  createJob(req: CreateEdaBuilderJobRequest): Promise<EdaBuilderJob> {
    return this.http.post<EdaBuilderJob>(`${BASE_PATH}/jobs`, req);
  }

  getJob(jobId: string): Promise<EdaBuilderJob> {
    return this.http.get<EdaBuilderJob>(`${BASE_PATH}/jobs/${encodeURIComponent(jobId)}`);
  }

  getEvents(jobId: string): Promise<EdaBuilderJobEvent[]> {
    return this.http.get<EdaBuilderJobEvent[]>(`${BASE_PATH}/jobs/${encodeURIComponent(jobId)}/events`);
  }

  getDraft(jobId: string): Promise<EdaAssetDraft> {
    return this.http.get<EdaAssetDraft>(`${BASE_PATH}/jobs/${encodeURIComponent(jobId)}/draft`);
  }

  patchDraft(jobId: string, patch: Partial<EdaAssetDraft>): Promise<EdaAssetDraft> {
    return this.http.patch<EdaAssetDraft>(`${BASE_PATH}/jobs/${encodeURIComponent(jobId)}/draft`, patch);
  }

  generate(jobId: string): Promise<EdaBuilderJob> {
    return this.http.post<EdaBuilderJob>(`${BASE_PATH}/jobs/${encodeURIComponent(jobId)}/generate`);
  }

  getArtifacts(jobId: string): Promise<EdaArtifactBundle> {
    return this.http.get<EdaArtifactBundle>(`${BASE_PATH}/jobs/${encodeURIComponent(jobId)}/artifacts`);
  }

  publish(jobId: string, req: PublishEdaBuilderJobRequest): Promise<PublishEdaBuilderJobResult> {
    return this.http.post<PublishEdaBuilderJobResult>(`${BASE_PATH}/jobs/${encodeURIComponent(jobId)}/publish`, req);
  }

  cancel(jobId: string): Promise<EdaBuilderJob> {
    return this.http.post<EdaBuilderJob>(`${BASE_PATH}/jobs/${encodeURIComponent(jobId)}/cancel`);
  }
}
