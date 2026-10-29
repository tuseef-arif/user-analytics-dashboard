import os
from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine
from sqlmodel import Session, SQLModel, create_engine

# Overwrite rather than setdefault so a developer's real env never reaches tests.
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["JWT_SECRET"] = "test-secret-do-not-use-0123456789abcdef"
os.environ["COOKIE_SECURE"] = "false"

from api import models  # noqa: E402, F401  registers tables on SQLModel.metadata
from api.config import get_settings  # noqa: E402
from api.database import get_session  # noqa: E402
from api.index import app  # noqa: E402

get_settings.cache_clear()


@pytest.fixture
def engine(tmp_path: Path) -> Iterator[Engine]:
    # A file DB gives every Session its own connection, as in production, so a
    # missing commit() in app code is invisible to the test and fails it.
    engine = create_engine(
        f"sqlite:///{tmp_path / 'test.db'}", connect_args={"check_same_thread": False}
    )
    SQLModel.metadata.create_all(engine)
    yield engine
    engine.dispose()


@pytest.fixture
def session(engine: Engine) -> Iterator[Session]:
    with Session(engine) as session:
        yield session


@pytest.fixture
def client(engine: Engine) -> Iterator[TestClient]:
    def session_per_request() -> Iterator[Session]:
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = session_per_request
    yield TestClient(app)
    app.dependency_overrides.clear()
