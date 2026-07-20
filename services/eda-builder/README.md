# EDA Asset Builder Service

Modular FastAPI service for Circuit Canvas EDA Asset Builder.

Phase 2 scope:

- Job, Draft, Event, Artifact API;
- local JSON storage under `.data/eda-builder`;
- idempotent job creation;
- explicit `not_implemented` stage results for extraction/generation;
- no PDF parsing, OCR, KiCad CLI, or CAD generation yet.

Run locally:

```bash
cd services/eda-builder
uvicorn app.main:app --reload --port 8000
```

Frontend standalone proxy:

```bash
EDA_BUILDER_URL=http://localhost:8000 cd server && npm run dev
```

API:

```text
GET    /health
POST   /api/v1/eda-builder/uploads
POST   /api/v1/eda-builder/jobs
GET    /api/v1/eda-builder/jobs/{jobId}
GET    /api/v1/eda-builder/jobs/{jobId}/events
GET    /api/v1/eda-builder/jobs/{jobId}/draft
PATCH  /api/v1/eda-builder/jobs/{jobId}/draft
POST   /api/v1/eda-builder/jobs/{jobId}/generate
GET    /api/v1/eda-builder/jobs/{jobId}/artifacts
POST   /api/v1/eda-builder/jobs/{jobId}/publish
POST   /api/v1/eda-builder/jobs/{jobId}/cancel
```
