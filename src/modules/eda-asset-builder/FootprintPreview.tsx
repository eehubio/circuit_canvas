import type { EdaArtifactBundle } from './types';

export function FootprintPreview({ bundle }: { bundle?: EdaArtifactBundle }) {
  if (!bundle?.footprint?.text) {
    return <div style={empty}>Footprint preview will appear after generation.</div>;
  }
  return (
    <div style={wrap}>
      <div style={{ fontWeight: 800, marginBottom: 8 }}>{bundle.footprintName}</div>
      <pre style={pre}>{bundle.footprint.text}</pre>
    </div>
  );
}

const wrap = { border: '1px solid #dbe6dd', borderRadius: 10, padding: 12, background: '#fff', overflow: 'auto', maxHeight: 260 } as const;
const pre = { margin: 0, fontSize: 10.5, whiteSpace: 'pre-wrap' } as const;
const empty = { padding: 24, borderRadius: 10, background: '#f8fafc', color: '#64748b', textAlign: 'center' as const };
