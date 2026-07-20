import type { EdaAssetDraft } from './types';

export function EvidencePanel({ draft, evidenceIds }: { draft?: EdaAssetDraft; evidenceIds?: string[] }) {
  const ids = new Set(evidenceIds ?? []);
  const evidence = (draft?.evidence ?? []).filter((item) => !ids.size || ids.has(item.id));
  if (!evidence.length) return <div style={empty}>No evidence anchor recorded.</div>;
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      {evidence.map((item) => (
        <div key={item.id} style={card}>
          <div style={{ fontSize: 10, color: '#64748b' }}>p.{item.page} · {item.type} · conf {item.confidence.toFixed(2)}</div>
          <div style={{ fontSize: 11 }}>{item.rawText ?? item.sourceStage}</div>
        </div>
      ))}
    </div>
  );
}

const card = { padding: 8, borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0' } as const;
const empty = { fontSize: 11, color: '#94a3b8' } as const;
