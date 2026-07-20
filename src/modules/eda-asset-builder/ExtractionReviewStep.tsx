import type { EdaAssetDraft } from './types';
import { EvidencePanel } from './EvidencePanel';
import { ReviewItemEditor } from './ReviewItemEditor';

export function ExtractionReviewStep({ draft, onDraft }: { draft?: EdaAssetDraft; onDraft: (draft: EdaAssetDraft) => void }) {
  if (!draft) return <div style={empty}>Create a job first to review the extracted draft.</div>;
  const resolveItem = (id: string, resolved: boolean) => {
    onDraft({ ...draft, reviewItems: draft.reviewItems.map((item) => item.id === id ? { ...item, resolved } : item) });
  };
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={summary}>
        <b>{draft.component.mpn}</b>
        <span>{draft.component.manufacturer ?? '—'} · {draft.component.category}</span>
        <span>{draft.pins.length} pins · {draft.packageVariants[0]?.rawName ?? 'No package'}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={panel}>
          <h4 style={h4}>Pins</h4>
          <div style={{ maxHeight: 210, overflow: 'auto' }}>
            {draft.pins.map((pin) => (
              <div key={pin.id} style={row}>
                <span style={{ fontFamily: 'monospace', fontWeight: 800 }}>{pin.number}</span>
                <span>{pin.name}</span>
                <small>{pin.type}</small>
                <small>conf {pin.confidence.toFixed(2)}</small>
              </div>
            ))}
          </div>
        </div>
        <div style={panel}>
          <h4 style={h4}>Package</h4>
          {draft.packageVariants.map((pkg) => (
            <div key={pkg.id} style={{ fontSize: 12, lineHeight: 1.7 }}>
              <b>{pkg.rawName}</b><br />
              {pkg.family} · {pkg.pinCount} pins · pitch {pkg.pitchMm ?? '—'}mm<br />
              body {pkg.body.lengthMm ?? '—'} × {pkg.body.widthMm ?? '—'} × {pkg.body.heightMm ?? '—'}mm
            </div>
          ))}
          <h4 style={h4}>Evidence</h4>
          <EvidencePanel draft={draft} />
        </div>
      </div>
      <div style={panel}>
        <h4 style={h4}>Review items</h4>
        <div style={{ display: 'grid', gap: 8 }}>
          {draft.reviewItems.map((item) => <ReviewItemEditor key={item.id} item={item} draft={draft} onResolve={(resolved) => resolveItem(item.id, resolved)} />)}
        </div>
      </div>
    </div>
  );
}

const empty = { padding: 24, borderRadius: 10, background: '#f8fafc', color: '#64748b', textAlign: 'center' as const };
const summary = { padding: 12, borderRadius: 10, background: '#e8f6ee', color: '#245b3a', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' as const };
const panel = { padding: 12, borderRadius: 10, background: '#fff', border: '1px solid #dbe6dd' } as const;
const h4 = { margin: '0 0 8px', color: '#245b3a' } as const;
const row = { display: 'grid', gridTemplateColumns: '42px 1fr 110px 70px', gap: 8, padding: '5px 0', borderBottom: '1px solid #f1f5f9', fontSize: 11.5 } as const;
