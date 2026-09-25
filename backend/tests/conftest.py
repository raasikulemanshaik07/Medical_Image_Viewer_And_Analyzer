"""
tests/conftest.py
-----------------
Pytest fixtures for the backend test suite.

WHY this was tricky:
  sqlite:///:memory: creates a brand-new, isolated in-memory database
  for EVERY new connection. If create_all() and the session factory use
  different connections (even to the same URL), they see different DBs
  and the tables don't exist in the session's DB.

SOLUTION:
  Use a named shared-cache in-memory SQLite database:
    sqlite:///file::memory:?cache=shared&uri=true
  All connections to this URI share the same in-memory DB within the
  process, so create_all() and the test sessions see the same tables.
"""
import io
import os
import tempfile

# ── Override DATABASE_URL BEFORE any app module loads ────────────────────────
# Use a temp file DB for tests so we avoid in-memory isolation issues.
_tmp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_tmp_db.close()
TEST_DB_PATH = _tmp_db.name
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH}"

import cv2              # noqa: E402
import numpy as np      # noqa: E402
import pytest           # noqa: E402
from fastapi.testclient import TestClient          # noqa: E402
from sqlalchemy import create_engine               # noqa: E402
from sqlalchemy.orm import sessionmaker            # noqa: E402

# Import models BEFORE Base so metadata is fully populated
import app.models.models  # noqa: F401, E402

from app.database import Base, get_db   # noqa: E402
from app.main import app                # noqa: E402

# ── Test engine (temp-file SQLite so all connections share the same DB) ──────
_test_engine = create_engine(
    f"sqlite:///{TEST_DB_PATH}",
    connect_args={"check_same_thread": False},
)
_TestingSession = sessionmaker(
    bind=_test_engine, autocommit=False, autoflush=False
)

# Create all tables immediately
Base.metadata.create_all(bind=_test_engine)


# ── Override FastAPI's get_db dependency ─────────────────────────────────────
def _override_get_db():
    db = _TestingSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = _override_get_db


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def client():
    """FastAPI TestClient shared across the entire test session."""
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c


@pytest.fixture(scope="session")
def png_image_bytes() -> bytes:
    """100×100 RGB PNG with a coloured square."""
    img = np.zeros((100, 100, 3), dtype=np.uint8)
    img[25:75, 25:75] = (200, 150, 100)
    ok, buf = cv2.imencode(".png", img)
    assert ok, "Failed to encode test PNG"
    return buf.tobytes()


@pytest.fixture(scope="session")
def gray_image_bytes() -> bytes:
    """80×80 grayscale PNG."""
    img = np.zeros((80, 80), dtype=np.uint8)
    img[10:70, 10:70] = 180
    ok, buf = cv2.imencode(".png", img)
    assert ok, "Failed to encode grayscale PNG"
    return buf.tobytes()


@pytest.fixture(scope="session")
def uploaded_image_id(client, png_image_bytes) -> str:
    """
    Upload one image and return its image_id.
    Session-scoped so only one upload is performed for all integration tests.
    """
    r = client.post(
        "/api/images/upload",
        files={"file": ("test_scan.png", io.BytesIO(png_image_bytes), "image/png")},
    )
    assert r.status_code == 201, (
        f"Upload fixture failed [{r.status_code}]: {r.text}"
    )
    return r.json()["image_id"]
