"""
database.py
-----------
SQLAlchemy engine, session factory, and declarative Base.

How it works:
- We use SQLite with synchronous SQLAlchemy (not async) for simplicity.
- `SessionLocal` is a factory — call it to get a DB session.
- `get_db` is a FastAPI dependency that yields a session and closes it
  automatically after each request (even if an exception occurs).
- All ORM models inherit from `Base`.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.config import settings


# ── Engine ────────────────────────────────────────────────────────────────────
# check_same_thread=False is required for SQLite when used with FastAPI
# because multiple threads may share the same connection during request handling.
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},
    echo=settings.debug,          # logs SQL queries when debug=True
)

# ── Session factory ───────────────────────────────────────────────────────────
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,   # we manage transactions explicitly
    autoflush=False,
)


# ── Declarative Base ──────────────────────────────────────────────────────────
class Base(DeclarativeBase):
    pass


# ── FastAPI dependency ────────────────────────────────────────────────────────
def get_db():
    """
    Yield a database session for the duration of a request, then close it.
    Usage in a route:  db: Session = Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create all tables defined by ORM models if they do not already exist."""
    # Import models so SQLAlchemy knows about them before calling create_all
    from app.models import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
