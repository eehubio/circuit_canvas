import type { EdaArtifactBundle } from './types';

export function SymbolPreview({ bundle }: { bundle?: EdaArtifactBundle }) {
  if (!bundle?.symbol && !bundle?.preview?.symbolSvg) {
    return <div style={empty}>Symbol preview will appear after generation.</div>;
  }
  return (
    <div style={wrap}>
      {bundle.preview?.symbolSvg
        ? <div dangerouslySetInnerHTML={{ __html: bundle.preview.symbolSvg }} />
        : <pre style={pre}>{bundle.symbol?.text}</pre>}
    </div>
  );
}

const wrap = { border: '1px solid #dbe6dd', borderRadius: 10, padding: 12, background: '#fff', overflow: 'auto' } as const;
const pre = { margin: 0, fontSize: 10.5, whiteSpace: 'pre-wrap' } as const;
const empty = { padding: 24, borderRadius: 10, background: '#f8fafc', color: '#64748b', textAlign: 'center' as const };
