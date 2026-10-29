import pytest
from fastapi.testclient import TestClient

from api.config import get_settings
from api.deps import ACCESS_TOKEN_COOKIE
from api.index import app

LOGIN_URL = "/api/auth/login"
ACCOUNT = {"username": "testuser@email.com", "password": "Password123@"}


@pytest.fixture
def registered(client: TestClient) -> None:
    response = client.post("/api/auth/register", json={**ACCOUNT, "gender": "male"})
    assert response.status_code == 201


@pytest.mark.usefixtures("registered")
def test_login_success(client: TestClient) -> None:
    response = client.post(LOGIN_URL, json=ACCOUNT)
    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"id", "username", "gender", "created_at"}
    assert body["username"] == "testuser@email.com"
    assert f"{ACCESS_TOKEN_COOKIE}=" in response.headers["set-cookie"]


@pytest.mark.usefixtures("registered")
def test_login_cookie_flags(client: TestClient) -> None:
    response = client.post(LOGIN_URL, json=ACCOUNT)
    cookie = response.headers["set-cookie"]
    assert "HttpOnly" in cookie
    assert "SameSite=lax" in cookie
    assert "Path=/" in cookie
    assert "Max-Age=3600" in cookie
    assert response.cookies[ACCESS_TOKEN_COOKIE] not in response.text


@pytest.mark.usefixtures("registered")
@pytest.mark.parametrize("secure", [True, False])
def test_login_cookie_secure_follows_settings(client: TestClient, secure: bool) -> None:
    settings = get_settings().model_copy(update={"cookie_secure": secure})
    # The client fixture clears dependency_overrides on teardown, restoring defaults.
    app.dependency_overrides[get_settings] = lambda: settings
    cookie = client.post(LOGIN_URL, json=ACCOUNT).headers["set-cookie"]
    assert ("Secure" in cookie) is secure


@pytest.mark.usefixtures("registered")
def test_login_wrong_password(client: TestClient) -> None:
    response = client.post(LOGIN_URL, json={**ACCOUNT, "password": "WrongPass123@"})
    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid username or password"}
    assert "set-cookie" not in response.headers


@pytest.mark.usefixtures("registered")
def test_login_unknown_user_same_error(client: TestClient) -> None:
    response = client.post(LOGIN_URL, json={**ACCOUNT, "username": "nobody@email.com"})
    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid username or password"}
    assert "set-cookie" not in response.headers


@pytest.mark.usefixtures("registered")
def test_login_normalizes_username(client: TestClient) -> None:
    response = client.post(
        LOGIN_URL, json={**ACCOUNT, "username": " TestUser@Email.com "}
    )
    assert response.status_code == 200
    assert response.json()["username"] == "testuser@email.com"


@pytest.mark.parametrize(
    "payload",
    [
        {"password": "Password123@"},
        {"username": "testuser@email.com"},
        {},
        {"username": "", "password": "Password123@"},
        {"username": "testuser@email.com", "password": ""},
    ],
    ids=["no-username", "no-password", "empty-body", "empty-username", "empty-password"],
)
def test_login_invalid_returns_422(client: TestClient, payload: dict) -> None:
    assert client.post(LOGIN_URL, json=payload).status_code == 422
