# EDA Asset Builder UI Flow

The plugin uses a six-step modal.

## 1. Source

- PDF upload;
- PDF URL;
- ezPLM component or MPN;
- pasted text fallback.

## 2. Existing Assets

Shows whether these are present:

- Datasheet;
- Pin Data;
- Symbol;
- Footprint;
- STEP;
- VRML.

Users choose requested output artifacts.

## 3. Extraction Review

Shows:

- MPN;
- manufacturer;
- category;
- pin table;
- package variants;
- evidence;
- review items.

Low-confidence fields must be explicitly resolved before normal generation.

## 4. Generation Settings

Controls requested KiCad 9/10 symbol, footprint, STEP, VRML outputs.

## 5. Progress

Displays job status, progress, and event timeline.

## 6. Preview / Publish

Tabs:

- Symbol;
- Footprint;
- 3D.

Actions:

- add generated bundle to current canvas;
- future: download ZIP;
- future: write back to ezPLM.
