from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Ignore unrelated keys so a shared .env (e.g. frontend vars) can't break startup.
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    jwt_secret: str
    cookie_secure: bool = True
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60


@lru_cache
def get_settings() -> Settings:
    # Required fields are validated here on first use, so importing the app needs no env.
    return Settings()  # type: ignore[call-arg]
