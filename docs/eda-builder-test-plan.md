# EDA Asset Builder Test Plan

## Current Phase 1 Tests

- Mock provider creates jobs and advances to `review_required`.
- Mock provider resolves draft, generates artifacts, and reaches `completed`.
- Generated artifact bundle parses and registers through existing KiCad parsers.
- HTTP Provider calls the unified `/v1/eda-builder` API and cancel endpoint.

## Current Phase 2 Tests

- FastAPI creates idempotent jobs.
- FastAPI returns placeholder drafts with blocking `not implemented` review item.
- FastAPI generate endpoint returns explicit `GENERATION_NOT_IMPLEMENTED`.
- FastAPI cancel endpoint transitions to `cancelled`.

## Future Contract Tests

- HTTP Provider matches FastAPI OpenAPI schema.
- Gateway proxy preserves auth headers and hides API keys.
- Job polling handles timeout, cancel, retry, and failed states.

## Future Extraction Tests

- LM358 SOIC-8 dual op-amp.
- LDO SOT-23-5.
- QFN-32 with exposed pad.
- ezPLM part with only missing STEP.

## Future Validation Tests

- Pin numbers are non-empty and unique.
- Pin set equals pad set.
- Pin 1 agrees across symbol, footprint, and model.
- KiCad CLI status is `not_run` when unavailable, never faked as passed.
