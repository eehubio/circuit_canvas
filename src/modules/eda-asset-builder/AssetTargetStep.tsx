import type { EdaExistingAssetState } from './types';
import type { EdaRequestedArtifacts } from '../../providers/types/eda-builder';

export function AssetTargetStep({
  existingAssets,
  requestedArtifacts,
  onExisting,
  onRequested,
}: {
  existingAssets: EdaExistingAssetState;
  requestedArtifacts: EdaRequestedArtifacts;
  onExisting: (assets: Partial<EdaExistingAssetState>) => void;
  onRequested: (requested: Partial<EdaRequestedArtifacts>) => void;
}) {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {([
          ['datasheet', 'Datasheet'],
          ['pinData', 'Pin Data'],
          ['symbol', 'Symbol'],
          ['footprint', 'Footprint'],
          ['step', 'STEP'],
          ['vrml', 'VRML'],
        ] as const).map(([key, label]) => (
          <label key={key} style={card}>
            <input type="checkbox" checked={existingAssets[key]} onChange={(e) => onExisting({ [key]: e.target.checked } as Partial<EdaExistingAssetState>)} />
            <span>{label}</span>
            <small>{existingAssets[key] ? '已有' : '缺失'}</small>
          </label>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
        {([
          ['symbol9', 'KiCad 9 Symbol'],
          ['symbol10', 'KiCad 10 Symbol'],
          ['footprint', 'Footprint'],
          ['step', 'STEP'],
          ['vrml', 'VRML'],
        ] as const).map(([key, label]) => (
          <label key={key} style={card}>
            <input type="checkbox" checked={requestedArtifacts[key]} onChange={(e) => onRequested({ [key]: e.target.checked } as Partial<EdaRequestedArtifacts>)} />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

const card = { padding: 10, borderRadius: 10, background: '#fff', border: '1px solid #dbe6dd', display: 'grid', gap: 4, fontSize: 12 } as const;
