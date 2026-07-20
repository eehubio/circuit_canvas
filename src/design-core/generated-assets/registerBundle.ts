import type { ComponentSearchResult } from '../../providers/types';
import { parseKicadMod } from '../geometry/kicad-file-parser';
import { parseKicadSym, registerFootprintOverride, registerSymbolOverride } from '../geometry/lib-file-registry';
import { ensureStepBytes } from '../../modules/board-editor/step-loader';
import type { EdaArtifactBundle } from '../../providers/types/eda-builder';
import type { RegisterGeneratedAssetResult } from './types';

export async function registerGeneratedAssetBundle(bundle: EdaArtifactBundle): Promise<RegisterGeneratedAssetResult> {
  const warnings = [...bundle.manifest.warnings];
  const registered = { symbol: false, footprint: false, step: false };

  const symbolFile = bundle.symbol ?? bundle.symbol10;
  if (symbolFile?.text) {
    const parsed = parseKicadSym(symbolFile.text);
    if (!parsed || !parsed.pins.length) throw new Error('Generated symbol parse failed');
    registerSymbolOverride(bundle.mpn, parsed);
    registered.symbol = true;
  }

  if (bundle.footprint?.text) {
    const parsed = parseKicadMod(bundle.footprint.text);
    if (!parsed || !parsed.pads.length) throw new Error('Generated footprint parse failed');
    registerFootprintOverride(bundle.footprintName ?? bundle.footprint.name.replace(/\.kicad_mod$/i, ''), parsed);
    registered.footprint = true;
  }

  if (bundle.step?.url) {
    ensureStepBytes(bundle.step.url);
    registered.step = true;
  }

  const component: ComponentSearchResult = {
    componentId: `generated_${bundle.jobId}`,
    mpn: bundle.mpn,
    manufacturer: bundle.manufacturer ?? 'Generated',
    category: bundle.category === 'unknown' ? 'ic' : bundle.category,
    defaultFootprintName: bundle.footprintName ?? bundle.footprint?.name.replace(/\.kicad_mod$/i, '') ?? 'SOIC-8',
    family: 'EDA Asset Builder',
    description: bundle.description ?? 'Generated KiCad asset bundle',
    pins: bundle.pins,
    stepUrl: bundle.step?.url,
    symbolFileUrl: undefined,
    footprintFileUrl: undefined,
  };

  return { component, registered, warnings };
}
