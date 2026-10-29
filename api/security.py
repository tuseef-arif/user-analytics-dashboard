from datetime import UTC, datetime, timedelta

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

from api.config import get_settings

_hasher = PasswordHasher()


def hash_password(plain: str) -> str:
    return _hasher.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return _hasher.verify(hashed, plain)
    except (VerificationError, InvalidHashError):
        return False


def create_access_token(user_id: int, expires_delta: timedelta | None = None) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": str(user_id), "iat": now, "exp": now + expires_delta}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> int | None:
    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            # Pin the algorithm so a token can't choose its own (e.g. "none").
            algorithms=[settings.jwt_algorithm],
            options={"require": ["exp", "iat", "sub"]},
        )
        return int(payload["sub"])
    except (jwt.InvalidTokenError, ValueError):
        return None
