from datetime import UTC, datetime, timedelta

import jwt
import pytest
from fastapi.testclient import TestClient

from api.deps import ACCESS_TOKEN_COOKIE
from api.security import create_access_token

ME_URL = "/api/auth/me"
LOGOUT_URL = "/api/auth/logout"
ACCOUNT = {"username": "testuser@email.com", "password": "Password123@"}


def _register(client: TestClient) -> int:
    response = client.post("/api/auth/register", json={**ACCOUNT, "gender": "male"})
    assert response.status_code == 201
    return response.json()["id"]


def _register_and_login(client: TestClient) -> int:
    user_id = _register(client)
    assert client.post("/api/auth/login", json=ACCOUNT).status_code == 200
    return user_id


def _assert_unauthenticated(client: TestClient) -> None:
    response = client.get(ME_URL)
    assert response.status_code == 401
    assert response.json() == {"detail": "Not authenticated"}


def test_me_without_cookie(client: TestClient) -> None:
    _assert_unauthenticated(client)


def test_me_after_login(client: TestClient) -> None:
    user_id = _register_and_login(client)
    response = client.get(ME_URL)
    assert response.status_code == 200
    assert response.json()["id"] == user_id
    assert response.json()["username"] == "testuser@email.com"


def _other_secret_token() -> str:
    now = datetime.now(UTC)
    return jwt.encode(
        {"sub": "1", "iat": now, "exp": now + timedelta(minutes=5)},
        "some-other-secret",
        algorithm="HS256",
    )


def _tampered_token() -> str:
    header, payload, signature = create_access_token(1).split(".")
    return f"{header}.{payload}.{'A' if signature[0] != 'A' else 'B'}{signature[1:]}"


@pytest.mark.parametrize(
    "make_token",
    [
        _tampered_token,
        lambda: "garbage",
        _other_secret_token,
        lambda: create_access_token(1, expires_delta=timedelta(seconds=-1)),
    ],
    ids=["tampered", "garbage", "other-secret", "expired"],
)
def test_me_with_bad_token(client: TestClient, make_token) -> None:
    # Register without logging in so the bad token is the only cookie sent for user 1.
    _register(client)
    client.cookies.set(ACCESS_TOKEN_COOKIE, make_token())
    _assert_unauthenticated(client)


def test_me_with_hand_set_valid_token(client: TestClient) -> None:
    # Control for the bad-token cases: the same cookie mechanism works when valid.
    user_id = _register(client)
    client.cookies.set(ACCESS_TOKEN_COOKIE, create_access_token(user_id))
    assert client.get(ME_URL).status_code == 200


def test_me_with_token_for_missing_user(client: TestClient) -> None:
    client.cookies.set(ACCESS_TOKEN_COOKIE, create_access_token(999))
    _assert_unauthenticated(client)


def test_logout_clears_cookie(client: TestClient) -> None:
    _register_and_login(client)
    response = client.post(LOGOUT_URL)
    assert response.status_code == 204
    assert response.content == b""
    cookie = response.headers["set-cookie"]
    assert cookie.startswith(f'{ACCESS_TOKEN_COOKIE}="";')
    assert "Max-Age=0" in cookie
    assert "Path=/" in cookie
    assert "HttpOnly" in cookie
    assert "SameSite=lax" in cookie
    _assert_unauthenticated(client)


def test_logout_when_logged_out(client: TestClient) -> None:
    assert client.post(LOGOUT_URL).status_code == 204


def test_full_flow(client: TestClient) -> None:
    _assert_unauthenticated(client)
    _register_and_login(client)
    assert client.get(ME_URL).status_code == 200
    assert client.post(LOGOUT_URL).status_code == 204
    _assert_unauthenticated(client)
