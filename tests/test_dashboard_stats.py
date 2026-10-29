import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from api.deps import ACCESS_TOKEN_COOKIE
from api.models import Gender, User
from api.security import create_access_token

STATS_URL = "/api/dashboard/stats"
ACCOUNT = {"username": "testuser@email.com", "password": "Password123@"}


@pytest.fixture
def logged_in(client: TestClient) -> None:
    response = client.post("/api/auth/register", json={**ACCOUNT, "gender": "male"})
    assert response.status_code == 201
    assert client.post("/api/auth/login", json=ACCOUNT).status_code == 200


def _seed(session: Session, counts: dict[Gender, int]) -> None:
    for gender, n in counts.items():
        for i in range(n):
            session.add(
                User(username=f"{gender.value}{i}", password_hash="h", gender=gender)
            )
    session.commit()


def test_stats_without_cookie(client: TestClient) -> None:
    response = client.get(STATS_URL)
    assert response.status_code == 401
    assert response.json() == {"detail": "Not authenticated"}


def test_stats_with_tampered_token(client: TestClient, session: Session) -> None:
    # Seed user 1 so the token would be valid if not for the tampering.
    _seed(session, {Gender.male: 1})
    header, payload, signature = create_access_token(1).split(".")
    tampered = f"{header}.{payload}.{'A' if signature[0] != 'A' else 'B'}{signature[1:]}"
    client.cookies.set(ACCESS_TOKEN_COOKIE, tampered)
    assert client.get(STATS_URL).status_code == 401


@pytest.mark.usefixtures("logged_in")
def test_stats_only_logged_in_user(client: TestClient) -> None:
    body = client.get(STATS_URL).json()
    assert body == {"total": 1, "by_gender": {"male": 1, "female": 0, "other": 0}}


@pytest.mark.usefixtures("logged_in")
def test_stats_includes_every_gender_with_zero_default(client: TestClient) -> None:
    by_gender = client.get(STATS_URL).json()["by_gender"]
    assert set(by_gender) == {"male", "female", "other"}
    assert by_gender["female"] == 0
    assert by_gender["other"] == 0


@pytest.mark.usefixtures("logged_in")
def test_stats_counts_seeded_users(client: TestClient, session: Session) -> None:
    _seed(session, {Gender.male: 3, Gender.female: 2, Gender.other: 1})
    response = client.get(STATS_URL)
    assert response.status_code == 200
    assert response.json() == {
        "total": 7,
        "by_gender": {"male": 4, "female": 2, "other": 1},
    }


@pytest.mark.usefixtures("logged_in")
def test_stats_reflects_new_registration(client: TestClient) -> None:
    before = client.get(STATS_URL).json()
    response = client.post(
        "/api/auth/register",
        json={"username": "newuser", "password": "Password123@", "gender": "female"},
    )
    assert response.status_code == 201
    after = client.get(STATS_URL).json()
    assert after["total"] == before["total"] + 1
    assert after["by_gender"]["female"] == before["by_gender"]["female"] + 1


@pytest.mark.usefixtures("logged_in")
def test_stats_by_gender_sums_to_total(client: TestClient, session: Session) -> None:
    _seed(session, {Gender.female: 5, Gender.other: 2})
    body = client.get(STATS_URL).json()
    assert sum(body["by_gender"].values()) == body["total"]


@pytest.mark.usefixtures("logged_in")
def test_stats_response_has_no_user_data(client: TestClient) -> None:
    response = client.get(STATS_URL)
    assert set(response.json()) == {"total", "by_gender"}
    assert ACCOUNT["username"] not in response.text
