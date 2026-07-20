# EDA Asset Builder Domain Model

## Stable Draft

`EdaAssetDraft` is the only input to deterministic asset generators.

It contains:

- source metadata;
- normalized component identity;
- pin definitions;
- package variants;
- requested artifacts;
- evidence anchors;
- review items;
- resolved flag.

## Evidence

Every low-confidence field should carry `evidenceIds`.

Evidence anchors preserve:

- page;
- bbox when available;
- raw text;
- source stage;
- confidence.

## Artifacts

The frontend consumes `EdaArtifactBundle`.

Supported files:

- KiCad 9 `.kicad_sym`;
- KiCad 10 `.kicad_sym`;
- `.kicad_mod`;
- STEP;
- VRML;
- JSON manifest;
- preview SVG/PNG.

## Runtime Registration

Generated bundles are registered through:

```ts
registerGeneratedAssetBundle(bundle)
```

The adapter:

- parses symbol text with `parseKicadSym`;
- registers symbol override with `registerSymbolOverride`;
- parses footprint text with `parseKicadMod`;
- registers footprint override with `registerFootprintOverride`;
- preloads STEP bytes with `ensureStepBytes`.

No KiCad parser is duplicated.
