import type { CircuitCanvasPluginManifest } from '../registry';

export const edaAssetBuilderManifest: CircuitCanvasPluginManifest = {
  id: 'eda-asset-builder',
  name: 'EDA Asset Builder',
  version: '0.1.0',
  entryLabel: '自动生成 KiCad 资产',
  description: 'Generate missing KiCad symbols, footprints, and 3D assets from datasheets or ezPLM components.',
  capabilities: [
    'pdf_upload',
    'pdf_url',
    'ezplm_component',
    'review_required',
    'kicad_symbol',
    'kicad_footprint',
    'step_model',
  ],
};
