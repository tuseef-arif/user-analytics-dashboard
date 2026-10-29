import pytest
from pydantic import ValidationError

from api.config import Settings


def test_short_jwt_secret_rejected_without_echoing_it() -> None:
    with pytest.raises(ValidationError) as exc_info:
        Settings(database_url="sqlite://", jwt_secret="too-short-secret")
    assert "jwt_secret" in str(exc_info.value)
    assert "too-short-secret" not in str(exc_info.value)


def test_32_char_jwt_secret_accepted() -> None:
    assert len(Settings(database_url="sqlite://", jwt_secret="x" * 32).jwt_secret) == 32
