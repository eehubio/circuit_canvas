from app.domain.job import JobStatus


PHASE2_UNIMPLEMENTED_STAGES: list[JobStatus] = [
    "parsing_pdf",
    "locating_sections",
    "extracting_pins",
    "extracting_packages",
    "generating_symbol",
    "matching_footprint",
    "generating_footprint",
    "matching_model",
    "generating_model",
    "validating",
]


def phase2_capabilities() -> dict:
    return {
        "implemented": ["uploads", "jobs", "events", "drafts", "artifacts", "cancel", "publish_stub"],
        "notImplemented": PHASE2_UNIMPLEMENTED_STAGES,
    }
