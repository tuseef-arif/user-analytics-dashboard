import pytest

from api.database import normalize_database_url


@pytest.mark.parametrize(
    ("url", "expected"),
    [
        ("postgres://u:p@host/db", "postgresql+psycopg://u:p@host/db"),
        ("postgresql://u:p@host/db", "postgresql+psycopg://u:p@host/db"),
        ("postgresql+psycopg://u:p@host/db", "postgresql+psycopg://u:p@host/db"),
        ("sqlite://", "sqlite://"),
        (
            "postgresql://u:p@host/db?sslmode=require&channel_binding=require",
            "postgresql+psycopg://u:p@host/db?sslmode=require&channel_binding=require",
        ),
    ],
    ids=["postgres", "postgresql", "already-psycopg", "sqlite", "query-string"],
)
def test_normalize_database_url(url: str, expected: str) -> None:
    assert normalize_database_url(url) == expected
