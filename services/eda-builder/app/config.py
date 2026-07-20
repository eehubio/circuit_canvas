from functools import lru_cache
from pathlib import Path
import os


class Settings:
    api_prefix = "/api/v1/eda-builder"
    max_upload_bytes = int(os.getenv("EDA_BUILDER_MAX_UPLOAD_BYTES", str(25 * 1024 * 1024)))
    data_dir = Path(os.getenv("EDA_BUILDER_DATA_DIR", ".data/eda-builder"))


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    return settings
