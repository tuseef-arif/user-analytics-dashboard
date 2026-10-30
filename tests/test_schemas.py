import pytest
from pydantic import ValidationError

from api.models import Gender, User
from api.schemas import PASSWORD_STRENGTH_MESSAGE, LoginIn, RegisterIn, UserOut


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


@pytest.mark.parametrize(
    "username",
    ["a b c", "bob\U0001f600", "ＡＤＭＩＮ", "café", "ab\tc"],
    ids=["inner-space", "emoji", "fullwidth", "accented", "tab"],
)
def test_register_rejects_disallowed_username_chars(username: str) -> None:
    with pytest.raises(ValidationError, match="may only contain"):
        RegisterIn(username=username, password="Password123@", gender="male")


@pytest.mark.parametrize("username", ["user.name_1", "a+b@c-d.io", "abc"])
def test_register_accepts_allowed_username_chars(username: str) -> None:
    assert RegisterIn(username=username, password="Password123@", gender="male")


def test_register_password_boundaries() -> None:
    base = {"username": "testuser", "gender": "male"}
    assert RegisterIn(**base, password="a1!" + "x" * 5)
    assert RegisterIn(**base, password="a1!" + "x" * 125)
    with pytest.raises(ValidationError):
        RegisterIn(**base, password="a1!" + "x" * 4)
    with pytest.raises(ValidationError):
        RegisterIn(**base, password="a1!" + "x" * 126)


@pytest.mark.parametrize(
    "password",
    ["12345678!", "Password!", "Password1", "Password 1", "        "],
    ids=["no-letter", "no-number", "no-special", "space-is-not-special", "spaces"],
)
def test_register_rejects_weak_password(password: str) -> None:
    with pytest.raises(ValidationError, match=PASSWORD_STRENGTH_MESSAGE):
        RegisterIn(username="testuser", password=password, gender="male")


@pytest.mark.parametrize(
    "password",
    ["Password123@", "pässwörd1_", "abc123\U0001f600xy", " Pass1! "],
    ids=["sample", "unicode-letters", "emoji-is-special", "surrounding-spaces"],
)
def test_register_accepts_strong_password(password: str) -> None:
    assert RegisterIn(username="testuser", password=password, gender="male")


def test_login_normalizes_username() -> None:
    assert LoginIn(username="  TestUser ", password="x").username == "testuser"


def test_login_password_capped_at_128() -> None:
    assert LoginIn(username="testuser", password="x" * 128)
    with pytest.raises(ValidationError):
        LoginIn(username="testuser", password="x" * 129)


def test_login_does_not_enforce_username_chars() -> None:
    # An odd username just fails to match a user (401) instead of revealing the rule.
    assert LoginIn(username="a b", password="x").username == "a b"


def test_user_out_excludes_password_hash() -> None:
    user = User(id=1, username="testuser", password_hash="secret", gender=Gender.male)
    dumped = UserOut.model_validate(user).model_dump()
    assert "password_hash" not in dumped
    assert dumped["username"] == "testuser"
