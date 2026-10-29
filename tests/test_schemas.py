import pytest
from pydantic import ValidationError

from api.models import Gender, User
from api.schemas import LoginIn, RegisterIn, UserOut


def test_register_normalizes_username() -> None:
    data = RegisterIn(username=" Test@Email.com ", password="Password123@", gender="male")
    assert data.username == "test@email.com"


def test_register_accepts_sample_account() -> None:
    data = RegisterIn(
        username="testuser@email.com", password="Password123@", gender="male"
    )
    assert data.username == "testuser@email.com"
    assert data.gender is Gender.male


@pytest.mark.parametrize(
    "payload",
    [
        {"username": "ab", "password": "Password123@", "gender": "male"},
        {"username": "testuser", "password": "short", "gender": "male"},
        {"username": "testuser", "password": "Password123@", "gender": "unknown"},
        {"password": "Password123@", "gender": "male"},
        {"username": "testuser", "gender": "male"},
        {"username": "testuser", "password": "Password123@"},
    ],
    ids=["short-username", "short-password", "bad-gender", "no-username",
         "no-password", "no-gender"],
)
def test_register_rejects_invalid(payload: dict[str, str]) -> None:
    with pytest.raises(ValidationError):
        RegisterIn(**payload)


def test_login_normalizes_username() -> None:
    assert LoginIn(username="  TestUser ", password="x").username == "testuser"


def test_user_out_excludes_password_hash() -> None:
    user = User(id=1, username="testuser", password_hash="secret", gender=Gender.male)
    dumped = UserOut.model_validate(user).model_dump()
    assert "password_hash" not in dumped
    assert dumped["username"] == "testuser"
