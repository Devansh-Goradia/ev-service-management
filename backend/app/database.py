"""
database.py — SQLAlchemy engine, session factory, and FastAPI dependency.

Loads DATABASE_URL from the .env file via python-dotenv and exposes
a get_db() generator that yields a scoped Session per request.
"""

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase

# ---------------------------------------------------------------------------
# Load environment variables
# ---------------------------------------------------------------------------
load_dotenv()

DATABASE_URL: str = os.getenv("DATABASE_URL", "")

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set. Add it to your .env file or environment."
    )

if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

# ---------------------------------------------------------------------------
# Engine — connect_args only needed for SQLite; kept empty for PostgreSQL
# ---------------------------------------------------------------------------
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,       # drop stale connections automatically
    pool_size=10,
    max_overflow=20,
    echo=False,               # set True to log SQL for debugging
)

# ---------------------------------------------------------------------------
# Session factory
# ---------------------------------------------------------------------------
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


# ---------------------------------------------------------------------------
# Declarative base — imported by models.py
# ---------------------------------------------------------------------------
class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""
    pass


# ---------------------------------------------------------------------------
# FastAPI dependency
# ---------------------------------------------------------------------------
def get_db():
    """
    Yield a database session for the duration of a single request.
    The session is always closed in the finally block, even on error.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
