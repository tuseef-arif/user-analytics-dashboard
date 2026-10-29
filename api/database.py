from collections.abc import Iterator
from functools import lru_cache

from sqlalchemy import Engine
from sqlalchemy.pool import NullPool
from sqlmodel import Session, create_engine

from api.config import get_settings


@lru_cache
def get_engine() -> Engine:
    # Serverless instances are short-lived; pooled connections would linger on the DB.
    return create_engine(get_settings().database_url, poolclass=NullPool)


def get_session() -> Iterator[Session]:
    with Session(get_engine()) as session:
        yield session
