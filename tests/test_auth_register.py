import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, func, select

from api.models import User

URL = "/api/auth/register"
VALID = {"username": "testuser", "password": "Password123@", "gender": "male"}


def test_register_success(client: TestClient) -> None:
    response = client.post(URL, json=VALID)
    assert response.status_code == 201
    body = response.json()
    assert set(body) == {"id", "username", "gender", "created_at"}
    assert body["username"] == "testuser"
    assert body["gender"] == "male"


def test_register_stores_argon2_hash(client: TestClient, session: Session) -> None:
    client.post(URL, json=VALID)
    user = session.exec(select(User).where(User.username == "testuser")).one()
    assert user.password_hash.startswith("$argon2")
    assert user.password_hash != VALID["password"]


def test_register_sample_account(client: TestClient) -> None:
    response = client.post(
        URL,
        json={
            "username": "testuser@email.com",
            "password": "Password123@",
            "gender": "male",
        },
    )
    assert response.status_code == 201
    assert response.json()["username"] == "testuser@email.com"


def test_register_normalizes_username(client: TestClient, session: Session) -> None:
    response = client.post(URL, json={**VALID, "username": " Test@Email.com "})
    assert response.status_code == 201
    assert response.json()["username"] == "test@email.com"
    assert session.exec(select(User.username)).one() == "test@email.com"


def test_register_duplicate_returns_409(client: TestClient) -> None:
    assert client.post(URL, json=VALID).status_code == 201
    response = client.post(URL, json=VALID)
    assert response.status_code == 409
    assert response.json() == {"detail": "Username already taken"}


def test_register_duplicate_different_case_returns_409(client: TestClient) -> None:
    assert client.post(URL, json=VALID).status_code == 201
    response = client.post(URL, json={**VALID, "username": "TestUser"})
    assert response.status_code == 409
    assert response.json() == {"detail": "Username already taken"}


def test_register_duplicate_rolls_back_session(
    client: TestClient, session: Session
) -> None:
    client.post(URL, json=VALID)
    client.post(URL, json=VALID)
    assert session.exec(select(func.count()).select_from(User)).one() == 1

    response = client.post(URL, json={**VALID, "username": "another"})
    assert response.status_code == 201


@pytest.mark.parametrize(
    "payload",
    [
        {"password": "Password123@", "gender": "male"},
        {"username": "testuser", "gender": "male"},
        {"username": "testuser", "password": "Password123@"},
        {**VALID, "gender": "unknown"},
        {**VALID, "username": "ab"},
        {**VALID, "password": "short"},
        {},
    ],
    ids=[
        "no-username",
        "no-password",
        "no-gender",
        "bad-gender",
        "short-username",
        "short-password",
        "empty-body",
    ],
)
def test_register_invalid_returns_422(client: TestClient, payload: dict) -> None:
    assert client.post(URL, json=payload).status_code == 422


@pytest.mark.parametrize("gender", ["male", "female", "other"])
def test_register_accepts_each_gender(client: TestClient, gender: str) -> None:
    response = client.post(URL, json={**VALID, "gender": gender})
    assert response.status_code == 201
    assert response.json()["gender"] == gender
