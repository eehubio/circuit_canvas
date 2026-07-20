import { useState } from 'react';
import type { EdaArtifactBundle } from './types';
import { FootprintPreview } from './FootprintPreview';
import { Model3DPreview } from './Model3DPreview';
import { SymbolPreview } from './SymbolPreview';

export function ArtifactPreviewStep({ bundle }: { bundle?: EdaArtifactBundle }) {
  const [tab, setTab] = useState<'symbol' | 'footprint' | 'model'>('symbol');
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {([
          ['symbol', 'Symbol'],
          ['footprint', 'Footprint'],
          ['model', '3D'],
        ] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={tab === id ? active : btn}>{label}</button>
        ))}
      </div>
      {tab === 'symbol' ? <SymbolPreview bundle={bundle} /> : tab === 'footprint' ? <FootprintPreview bundle={bundle} /> : <Model3DPreview bundle={bundle} />}
      {bundle && (
        <div style={{ fontSize: 11, color: '#64748b' }}>
          Validation: {bundle.manifest.validationStatus} · warnings: {bundle.manifest.warnings.length || 0}
        </div>
      )}
    </div>
  );
}

const btn = { padding: '7px 12px', borderRadius: 8, border: '1px solid #dbe6dd', background: '#fff', cursor: 'pointer', fontWeight: 700 } as const;
const active = { ...btn, borderColor: '#2f8f55', background: '#e8f6ee', color: '#245b3a' } as const;
