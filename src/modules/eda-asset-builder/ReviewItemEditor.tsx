import type { EdaReviewItem } from '../../providers/types/eda-builder';
import { EvidencePanel } from './EvidencePanel';
import type { EdaAssetDraft } from './types';

export function ReviewItemEditor({ item, draft, onResolve }: { item: EdaReviewItem; draft?: EdaAssetDraft; onResolve: (resolved: boolean) => void }) {
  const color = item.severity === 'blocking' ? '#b91c1c' : item.severity === 'warning' ? '#b45309' : '#0369a1';
  return (
    <div style={{ padding: 10, borderRadius: 10, background: item.resolved ? '#f0fdf4' : '#fffbeb', border: `1px solid ${item.resolved ? '#bbf7d0' : '#fde68a'}` }}>
      <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer' }}>
        <input type="checkbox" checked={item.resolved} onChange={(e) => onResolve(e.target.checked)} style={{ marginTop: 2 }} />
        <span style={{ flex: 1 }}>
          <span style={{ display: 'block', fontSize: 12, fontWeight: 800, color }}>{item.title}</span>
          <span style={{ display: 'block', fontSize: 11, color: '#475569', marginTop: 3 }}>{item.message}</span>
        </span>
      </label>
      <div style={{ marginTop: 8 }}>
        <EvidencePanel draft={draft} evidenceIds={item.evidenceIds} />
      </div>
    </div>
  );
}
