from collections.abc import Iterator
from functools import lru_cache

from sqlalchemy import Engine
from sqlalchemy.pool import NullPool
from sqlmodel import Session, create_engine

from api.config import get_settings

_PSYCOPG_SCHEME = "postgresql+psycopg://"


def normalize_database_url(url: str) -> str:
    # Neon and most hosts hand out postgres(ql):// URLs, which SQLAlchemy maps to
    # psycopg2; we only ship psycopg 3.
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return _PSYCOPG_SCHEME + url.removeprefix(prefix)
    return url


@lru_cache
def get_engine() -> Engine:
    # Serverless instances are short-lived; pooled connections would linger on the DB.
    return create_engine(
        normalize_database_url(get_settings().database_url), poolclass=NullPool
    )


def get_session() -> Iterator[Session]:
    with Session(get_engine()) as session:
        yield session
