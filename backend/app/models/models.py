"""
models/models.py
----------------
SQLAlchemy ORM models mapping Python classes → SQLite tables.

Three tables:
  1. images             — one row per uploaded file
  2. analysis_results   — one row per analysis operation
  3. processing_history — one row per processing operation
"""
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, DateTime, ForeignKey, Text
)
from app.database import Base


def _utcnow() -> datetime:
    """Return timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)


class Image(Base):
    """
    Stores metadata for each uploaded image.
    The actual file bytes live on disk; this table tracks where they are
    and their basic properties.
    """
    __tablename__ = "images"

    id              = Column(Integer, primary_key=True, index=True, autoincrement=True)
    image_id        = Column(String(64), unique=True, index=True, nullable=False)
    filename        = Column(String(255), nullable=False)          # original filename
    stored_filename = Column(String(255), nullable=False)          # safe server-side name
    file_format     = Column(String(16), nullable=False)           # PNG / JPEG / TIFF
    width           = Column(Integer, nullable=False)
    height          = Column(Integer, nullable=False)
    channels        = Column(Integer, nullable=False)              # 1 = grayscale, 3 = RGB
    file_size       = Column(Integer, nullable=False)              # bytes
    created_at      = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    def __repr__(self) -> str:
        return f"<Image id={self.image_id} file={self.filename}>"


class AnalysisResult(Base):
    """
    Stores the result of any analysis operation run against an image.

    `parameters` and `result_data` are stored as JSON strings so we can
    accommodate any analysis type without schema migrations.

    IMPORTANT: These results are experimental image metrics only.
    They are NOT clinical diagnoses and must not be interpreted as such.
    """
    __tablename__ = "analysis_results"

    id            = Column(Integer, primary_key=True, index=True, autoincrement=True)
    image_id      = Column(String(64), ForeignKey("images.image_id"), nullable=False, index=True)
    analysis_type = Column(String(64), nullable=False)   # "statistics" | "roi" | "histogram"
    parameters    = Column(Text, nullable=True)          # JSON string
    result_data   = Column(Text, nullable=False)         # JSON string
    created_at    = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    def __repr__(self) -> str:
        return f"<AnalysisResult image={self.image_id} type={self.analysis_type}>"


class ProcessingHistory(Base):
    """
    Audit log of every image-processing operation applied to an image.

    Useful for:
    - Showing the user what operations have been run.
    - Debugging processing pipelines.
    - Interview demonstration of persistence and audit trails.
    """
    __tablename__ = "processing_history"

    id             = Column(Integer, primary_key=True, index=True, autoincrement=True)
    image_id       = Column(String(64), ForeignKey("images.image_id"), nullable=False, index=True)
    operation_name = Column(String(64), nullable=False)  # e.g. "gaussian_blur"
    parameters     = Column(Text, nullable=True)         # JSON string of operation params
    created_at     = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    def __repr__(self) -> str:
        return f"<ProcessingHistory image={self.image_id} op={self.operation_name}>"
