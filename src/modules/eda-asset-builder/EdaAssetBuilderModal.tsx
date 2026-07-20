import { useEffect } from 'react';
import { useEdaBuilderStore, type EdaBuilderStep } from '../../state/edaBuilderStore';
import type { EdaArtifactBundle, EdaBuilderProvider } from './types';
import { AssetSourceStep } from './AssetSourceStep';
import { AssetTargetStep } from './AssetTargetStep';
import { ExtractionReviewStep } from './ExtractionReviewStep';
import { GenerationProgressStep } from './GenerationProgressStep';
import { ArtifactPreviewStep } from './ArtifactPreviewStep';

const steps = ['来源', '资产检查', '提取审核', '生成设置', '生成校验', '预览发布'] as const;

export function EdaAssetBuilderModal({
  provider,
  onClose,
  onPublishToCanvas,
}: {
  provider: EdaBuilderProvider;
  onClose: () => void;
  onPublishToCanvas: (bundle: EdaArtifactBundle) => Promise<void>;
}) {
  const st = useEdaBuilderStore();

  useEffect(() => { st.restore(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!st.job || ['review_required', 'ready_to_generate', 'completed', 'failed', 'cancelled'].includes(st.job.status)) return;
    const timer = window.setInterval(async () => {
      const job = await provider.getJob(st.job!.jobId);
      st.setJob(job);
      st.setEvents(await provider.getEvents(job.jobId));
      if (job.status === 'review_required' || job.status === 'ready_to_generate') {
        st.setDraft(await provider.getDraft(job.jobId));
        st.setStep(2);
      }
      if (job.status === 'completed') {
        st.setArtifacts(await provider.getArtifacts(job.jobId));
        st.setStep(5);
      }
    }, 650);
    return () => window.clearInterval(timer);
  }, [provider, st.job?.jobId, st.job?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const createJob = async () => {
    st.setBusy(true);
    st.setMessage(undefined);
    try {
      const source = { ...st.source };
      if (source.type === 'pdf_upload') source.documentId = st.selectedFileName ? `local:${st.selectedFileName}` : 'local:pending-upload';
      const job = await provider.createJob({
        source,
        requestedArtifacts: st.requestedArtifacts,
        existingAssets: st.existingAssets,
        mode: 'missing_only',
      });
      st.setJob(job);
      st.setEvents(await provider.getEvents(job.jobId));
      st.setStep(4);
    } catch (error) {
      st.setMessage((error as Error).message);
    } finally {
      st.setBusy(false);
    }
  };

  const saveDraft = async () => {
    if (!st.job || !st.draft) return;
    st.setBusy(true);
    try {
      const draft = await provider.patchDraft(st.job.jobId, st.draft);
      st.setDraft(draft);
      st.setJob(await provider.getJob(st.job.jobId));
      st.setEvents(await provider.getEvents(st.job.jobId));
      st.setStep(3);
    } finally {
      st.setBusy(false);
    }
  };

  const generate = async () => {
    if (!st.job) return;
    st.setBusy(true);
    try {
      const job = await provider.generate(st.job.jobId);
      st.setJob(job);
      st.setEvents(await provider.getEvents(job.jobId));
      st.setArtifacts(await provider.getArtifacts(job.jobId));
      st.setStep(5);
    } catch (error) {
      st.setMessage((error as Error).message);
    } finally {
      st.setBusy(false);
    }
  };

  const publishToCanvas = async () => {
    if (!st.artifacts) return;
    st.setBusy(true);
    try {
      await onPublishToCanvas(st.artifacts);
      if (st.job) await provider.publish(st.job.jobId, { target: 'canvas' });
      st.setMessage('已注册到当前画布');
    } catch (error) {
      st.setMessage((error as Error).message);
    } finally {
      st.setBusy(false);
    }
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <header style={header}>
          <div>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 800 }}>EDA Asset Builder · KiCad 资产生成器</div>
            <h2 style={{ margin: '4px 0 0', color: '#163b26' }}>从 Datasheet / ezPLM 生成缺失 EDA 资产</h2>
          </div>
          <button onClick={onClose} style={iconBtn}>×</button>
        </header>

        <div style={stepper}>
          {steps.map((label, index) => (
            <button key={label} onClick={() => st.setStep(index as EdaBuilderStep)} style={st.step === index ? activeStep : stepBtn}>
              {index + 1}. {label}
            </button>
          ))}
        </div>

        <main style={body}>
          {st.step === 0 && <AssetSourceStep source={st.source} selectedFileName={st.selectedFileName} onSource={st.setSource} onFile={st.setSelectedFileName} />}
          {st.step === 1 && <AssetTargetStep existingAssets={st.existingAssets} requestedArtifacts={st.requestedArtifacts} onExisting={st.setExistingAssets} onRequested={st.setRequestedArtifacts} />}
          {st.step === 2 && <ExtractionReviewStep draft={st.draft} onDraft={st.setDraft} />}
          {st.step === 3 && (
            <div style={{ display: 'grid', gap: 10 }}>
              <AssetTargetStep existingAssets={st.existingAssets} requestedArtifacts={st.requestedArtifacts} onExisting={st.setExistingAssets} onRequested={st.setRequestedArtifacts} />
              <div style={note}>MVP 采用公共 Symbol IR；LLM 只允许作为结构化提取 fallback，不能直接生成 KiCad 文件。</div>
            </div>
          )}
          {st.step === 4 && <GenerationProgressStep job={st.job} events={st.events} />}
          {st.step === 5 && <ArtifactPreviewStep bundle={st.artifacts} />}
        </main>

        {st.message && <div style={message}>{st.message}</div>}

        <footer style={footer}>
          <button onClick={st.resetBuilder} style={ghostBtn}>重置</button>
          <span style={{ flex: 1 }} />
          {st.step > 0 && <button onClick={() => st.setStep((st.step - 1) as EdaBuilderStep)} style={ghostBtn}>上一步</button>}
          {st.step < 1 && <button onClick={() => st.setStep(1)} style={primaryBtn}>下一步</button>}
          {st.step === 1 && <button disabled={st.busy} onClick={createJob} style={primaryBtn}>{st.busy ? '创建中…' : '创建 Job'}</button>}
          {st.step === 2 && <button disabled={st.busy || !st.draft} onClick={saveDraft} style={primaryBtn}>确认审核</button>}
          {st.step === 3 && <button disabled={st.busy || !st.job} onClick={generate} style={primaryBtn}>开始生成</button>}
          {st.step === 4 && st.job?.status === 'completed' && <button onClick={() => st.setStep(5)} style={primaryBtn}>查看结果</button>}
          {st.step === 5 && <button disabled={st.busy || !st.artifacts} onClick={publishToCanvas} style={primaryBtn}>加入当前画布</button>}
        </footer>
      </div>
    </div>
  );
}

const overlay = { position: 'fixed', inset: 0, zIndex: 1300, background: 'rgba(15,23,42,.48)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 } as const;
const modal = { width: 'min(980px, 96vw)', maxHeight: '92vh', background: '#fff', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,.28)' } as const;
const header = { padding: '18px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', gap: 12 } as const;
const body = { padding: 18, overflow: 'auto', background: '#f8fafc', minHeight: 420 } as const;
const footer = { padding: 14, borderTop: '1px solid #e2e8f0', display: 'flex', gap: 8, alignItems: 'center' } as const;
const stepper = { padding: 10, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, borderBottom: '1px solid #e2e8f0' } as const;
const stepBtn = { padding: '8px 6px', borderRadius: 8, border: '1px solid #dbe6dd', background: '#fff', fontSize: 11, cursor: 'pointer', fontWeight: 700 } as const;
const activeStep = { ...stepBtn, background: '#e8f6ee', color: '#245b3a', borderColor: '#2f8f55' } as const;
const primaryBtn = { padding: '8px 14px', borderRadius: 8, border: 'none', background: '#2f8f55', color: '#fff', fontWeight: 800, cursor: 'pointer' } as const;
const ghostBtn = { padding: '8px 14px', borderRadius: 8, border: '1px solid #dbe6dd', background: '#fff', fontWeight: 700, cursor: 'pointer' } as const;
const iconBtn = { border: 'none', background: '#f1f5f9', borderRadius: 999, width: 30, height: 30, cursor: 'pointer', fontSize: 20, marginLeft: 'auto' } as const;
const message = { margin: '0 18px 12px', padding: 10, borderRadius: 8, background: '#eff6ff', color: '#1d4ed8', fontSize: 12 } as const;
const note = { padding: 10, borderRadius: 10, background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', fontSize: 12 } as const;
