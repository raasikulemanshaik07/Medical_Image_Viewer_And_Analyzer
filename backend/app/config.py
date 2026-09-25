"""
config.py
---------
Central application configuration.
All values can be overridden via environment variables or a .env file.
"""
from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── Application ──────────────────────────────────────────────────────────
    app_name: str = "Medical Image Viewer & Analyzer"
    app_version: str = "1.0.0"
    debug: bool = False

    # ── File storage ─────────────────────────────────────────────────────────
    # BASE_DIR is the backend/ directory
    base_dir: Path = Path(__file__).resolve().parent.parent
    upload_dir: Path = base_dir / "uploads"
    # Processed images go in a temp/ subdirectory that is wiped on every restart.
    # This implements the user's design decision: option (b) — store files for the
    # session but do not persist them across restarts.
    processed_dir: Path = base_dir / "uploads" / "temp"

    # ── Upload constraints ───────────────────────────────────────────────────
    # 50 MB limit
    max_upload_size_bytes: int = 50 * 1024 * 1024
    allowed_extensions: set[str] = {"png", "jpg", "jpeg", "tiff", "tif"}
    # MIME types we accept from Pillow validation
    allowed_formats: set[str] = {"PNG", "JPEG", "TIFF"}

    # ── Database ─────────────────────────────────────────────────────────────
    project_root: Path = base_dir.parent
    database_url: str = f"sqlite:///{base_dir.parent / 'database' / 'medical_images.db'}"

    # ── CORS ─────────────────────────────────────────────────────────────────
    allowed_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Singleton instance — import this everywhere
settings = Settings()

# Ensure storage directories exist at import time
settings.upload_dir.mkdir(parents=True, exist_ok=True)
settings.processed_dir.mkdir(parents=True, exist_ok=True)
(settings.project_root / "database").mkdir(parents=True, exist_ok=True)
