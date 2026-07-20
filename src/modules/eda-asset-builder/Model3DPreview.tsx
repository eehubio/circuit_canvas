import type { EdaArtifactBundle } from './types';

export function Model3DPreview({ bundle }: { bundle?: EdaArtifactBundle }) {
  return (
    <div style={wrap}>
      <div style={{ fontSize: 34 }}>🧊</div>
      <div style={{ fontWeight: 800 }}>{bundle?.step?.name ?? 'STEP / VRML'}</div>
      <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
        {bundle?.step?.url ? `Registered future model URL: ${bundle.step.url}` : '3D model matching/generation is handled by the Builder service in later phases.'}
      </div>
    </div>
  );
}

const wrap = { minHeight: 180, border: '1px dashed #cbd5e1', borderRadius: 10, background: '#f8fafc', display: 'grid', placeItems: 'center', textAlign: 'center' as const, padding: 20 };
