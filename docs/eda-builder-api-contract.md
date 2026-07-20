# EDA Asset Builder API Contract

Base path:

```text
/api/v1/eda-builder
```

## Endpoints

```text
POST   /uploads
POST   /jobs
GET    /jobs/{jobId}
GET    /jobs/{jobId}/events
GET    /jobs/{jobId}/draft
PATCH  /jobs/{jobId}/draft
POST   /jobs/{jobId}/generate
GET    /jobs/{jobId}/artifacts
POST   /jobs/{jobId}/publish
POST   /jobs/{jobId}/cancel
```

## Job Source

```ts
type EdaAssetSourceType = 'pdf_upload' | 'pdf_url' | 'ezplm_component' | 'manual';
```

`POST /jobs` accepts:

```json
{
  "source": { "type": "ezplm_component", "componentId": "uuid", "mpn": "LM358DR" },
  "requestedArtifacts": {
    "symbol9": true,
    "symbol10": true,
    "footprint": true,
    "step": true,
    "vrml": false
  },
  "mode": "missing_only"
}
```

## Status

Jobs use one state machine:

```text
created → queued → ingesting → parsing_pdf → locating_sections
→ extracting_pins → extracting_packages → building_draft
→ review_required → ready_to_generate → generating_symbol
→ matching_footprint → generating_footprint → matching_model
→ generating_model → validating → completed
```

Terminal states:

```text
completed | failed | cancelled
```

## Frontend Provider

The React plugin only depends on:

```ts
EdaBuilderProvider
```

Current Phase 1 implementation:

```ts
MockEdaBuilderProvider
```

Future Phase 2 implementation:

```ts
HttpEdaBuilderProvider
```

Phase 2 routes are implemented by the FastAPI service under:

```text
services/eda-builder
```

Gateway configuration:

| Runtime | Frontend base | Gateway target |
|---|---|---|
| standalone | `VITE_EDA_BUILDER_API_BASE_URL=http://localhost:8787/api` | `server/` forwards to `EDA_BUILDER_URL` |
| Vercel | `VITE_EDA_BUILDER_API_BASE_URL=/api` | `api/v1/eda-builder/[...path].js` forwards to `EDA_BUILDER_URL` |

Phase 2 intentionally returns empty artifact bundles with `validationStatus: "not_run"` until deterministic generators are implemented.
