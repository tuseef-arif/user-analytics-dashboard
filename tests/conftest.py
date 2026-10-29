import os
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

# Overwrite rather than setdefault so a developer's real env never reaches tests.
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["JWT_SECRET"] = "test-secret-do-not-use"
os.environ["COOKIE_SECURE"] = "false"

from api import models  # noqa: E402, F401  registers tables on SQLModel.metadata
from api.config import get_settings  # noqa: E402
from api.database import get_session  # noqa: E402
from api.index import app  # noqa: E402

get_settings.cache_clear()


@pytest.fixture
def session() -> Iterator[Session]:
    # StaticPool reuses one connection; otherwise each new one gets an empty in-memory DB.
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


@pytest.fixture
def client(session: Session) -> Iterator[TestClient]:
    app.dependency_overrides[get_session] = lambda: session
    yield TestClient(app)
    app.dependency_overrides.clear()
