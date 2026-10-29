from fastapi.testclient import TestClient
from sqlmodel import Session, func, select

from api.models import User
from api.security import verify_password
from api.seed_test_user import TEST_PASSWORD, TEST_USERNAME, seed_test_user


def test_seed_test_user_is_idempotent(session: Session) -> None:
    assert seed_test_user(session) is True
    assert seed_test_user(session) is False
    assert session.exec(select(func.count()).select_from(User)).one() == 1


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
