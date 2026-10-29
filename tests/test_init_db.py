from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, inspect
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, create_engine, func, select

from api.init_db import create_tables
from api.models import Gender, User
from api.security import verify_password
from api.seed_test_user import TEST_PASSWORD, TEST_USERNAME, seed_test_user


@pytest.fixture
def bare_engine() -> Iterator[Engine]:
    # Fresh engine without tables, unlike the conftest session fixture.
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    yield engine
    engine.dispose()


def _user_count(session: Session) -> int:
    return session.exec(select(func.count()).select_from(User)).one()


def test_create_tables_creates_user_table(bare_engine: Engine) -> None:
    assert "user" not in inspect(bare_engine).get_table_names()
    create_tables(bare_engine)
    assert "user" in inspect(bare_engine).get_table_names()


def test_create_tables_twice_keeps_rows(bare_engine: Engine) -> None:
    create_tables(bare_engine)
    with Session(bare_engine) as session:
        session.add(User(username="keepme", password_hash="h", gender=Gender.other))
        session.commit()

    create_tables(bare_engine)
    with Session(bare_engine) as session:
        assert _user_count(session) == 1


def test_seed_test_user_is_idempotent(session: Session) -> None:
    assert seed_test_user(session) is True
    assert seed_test_user(session) is False
    assert _user_count(session) == 1


def test_seeded_password_is_argon2_and_verifies(session: Session) -> None:
    seed_test_user(session)
    user = session.exec(select(User).where(User.username == TEST_USERNAME)).one()
    assert user.password_hash.startswith("$argon2")
    assert verify_password(TEST_PASSWORD, user.password_hash)


def test_seeded_account_can_log_in(client: TestClient, session: Session) -> None:
    seed_test_user(session)
    response = client.post(
        "/api/auth/login", json={"username": TEST_USERNAME, "password": TEST_PASSWORD}
    )
    assert response.status_code == 200
    assert response.json()["username"] == TEST_USERNAME
