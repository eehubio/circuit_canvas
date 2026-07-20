import { describe, expect, it } from 'vitest';
import { registerGeneratedAssetBundle } from '../registerBundle';
import type { EdaArtifactBundle } from '../../../providers/types/eda-builder';

const bundle: EdaArtifactBundle = {
  jobId: 'eda_test',
  mpn: 'LM358DR',
  manufacturer: 'Texas Instruments',
  category: 'ic',
  description: 'Dual operational amplifier',
  footprintName: 'SOIC-8',
  pins: 8,
  symbol: {
    name: 'LM358DR.kicad_sym',
    mimeType: 'text/plain',
    validationStatus: 'passed',
    warnings: [],
    text: `(kicad_symbol_lib (version 20231120) (generator "test")
      (symbol "LM358DR"
        (symbol "LM358DR_1_1"
          (rectangle (start -5.08 5.08) (end 5.08 -5.08))
          (pin input line (at -7.62 0 0) (length 2.54) (name "IN") (number "1"))
          (pin output line (at 7.62 0 180) (length 2.54) (name "OUT") (number "2"))
        )
      )
    )`,
  },
  footprint: {
    name: 'SOIC-8.kicad_mod',
    mimeType: 'text/plain',
    validationStatus: 'passed',
    warnings: [],
    text: `(footprint "SOIC-8"
      (fp_rect (start -2 -2) (end 2 2) (layer "F.Fab"))
      (pad "1" smd roundrect (at -2.7 -1.9) (size 1.5 0.6) (layers "F.Cu" "F.Paste" "F.Mask"))
      (pad "2" smd roundrect (at -2.7 -0.6) (size 1.5 0.6) (layers "F.Cu" "F.Paste" "F.Mask"))
    )`,
  },
  manifest: {
    schemaVersion: '0.1',
    generatedAt: '2026-07-19T00:00:00.000Z',
    validationStatus: 'passed',
    warnings: [],
  },
};

describe('registerGeneratedAssetBundle', () => {
  it('parses generated files and returns a canvas component result', async () => {
    const result = await registerGeneratedAssetBundle(bundle);

    expect(result.registered.symbol).toBe(true);
    expect(result.registered.footprint).toBe(true);
    expect(result.component.mpn).toBe('LM358DR');
    expect(result.component.defaultFootprintName).toBe('SOIC-8');
  });
});
