import type { ComponentSearchResult } from '../../providers/types';
import type { EdaArtifactBundle } from '../../providers/types/eda-builder';

export interface RegisterGeneratedAssetResult {
  component: ComponentSearchResult;
  registered: {
    symbol: boolean;
    footprint: boolean;
    step: boolean;
  };
  warnings: string[];
}

export type GeneratedAssetBundle = EdaArtifactBundle;
