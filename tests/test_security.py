from datetime import UTC, datetime, timedelta

import jwt

from api.config import get_settings
from api.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_hash_is_argon2_not_plaintext() -> None:
    hashed = hash_password("Password123@")
    assert hashed != "Password123@"
    assert hashed.startswith("$argon2")


def test_verify_password_true_and_false() -> None:
    hashed = hash_password("Password123@")
    assert verify_password("Password123@", hashed) is True
    assert verify_password("wrong-password", hashed) is False


def test_verify_password_garbage_hash_returns_false() -> None:
    assert verify_password("Password123@", "not-a-hash") is False


def test_token_round_trip() -> None:
    assert decode_access_token(create_access_token(42)) == 42


def test_expired_token_returns_none() -> None:
    token = create_access_token(1, expires_delta=timedelta(seconds=-1))
    assert decode_access_token(token) is None


def test_token_with_other_secret_returns_none() -> None:
    now = datetime.now(UTC)
    token = jwt.encode(
        {"sub": "1", "iat": now, "exp": now + timedelta(minutes=5)},
        "some-other-secret-that-is-also-32-bytes",
        algorithm="HS256",
    )
    assert decode_access_token(token) is None


def test_tampered_token_returns_none() -> None:
    header, payload, signature = create_access_token(1).split(".")
    tampered = ("A" if signature[0] != "A" else "B") + signature[1:]
    assert decode_access_token(f"{header}.{payload}.{tampered}") is None


def test_garbage_token_returns_none() -> None:
    assert decode_access_token("not.a.jwt") is None
    assert decode_access_token("") is None


def test_token_without_sub_returns_none() -> None:
    settings = get_settings()
    now = datetime.now(UTC)
    token = jwt.encode(
        {"iat": now, "exp": now + timedelta(minutes=5)},
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )
    assert decode_access_token(token) is None
