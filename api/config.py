from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Ignore unrelated keys so a shared .env (e.g. frontend vars) can't break startup.
    # Hide inputs so a validation error never prints the secret or DB password.
    model_config = SettingsConfigDict(
        env_file=".env", extra="ignore", hide_input_in_errors=True
    )

    database_url: str
    # RFC 7518 requires an HS256 key of at least 256 bits; shorter keys are brute-forceable.
    jwt_secret: str = Field(min_length=32)
    cookie_secure: bool = True
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60


@lru_cache
def get_settings() -> Settings:
    # Required fields are validated here on first use, so importing the app needs no env.
    return Settings()  # type: ignore[call-arg]
