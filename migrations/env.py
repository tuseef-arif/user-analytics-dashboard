from logging.config import fileConfig

from alembic import context
from sqlalchemy import Connection
from sqlalchemy.pool import NullPool
from sqlmodel import SQLModel, create_engine

from api import models  # noqa: F401  registers tables on SQLModel.metadata
from api.config import get_settings
from api.database import normalize_database_url

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = SQLModel.metadata


def _run(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        # SQLite can't ALTER most columns in place; batch mode copies the table instead.
        render_as_batch=connection.dialect.name == "sqlite",
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_offline() -> None:
    context.configure(
        url=normalize_database_url(get_settings().database_url),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    # Tests and scripts pass their own connection so they never touch DATABASE_URL.
    connection = config.attributes.get("connection")
    if connection is not None:
        _run(connection)
        return

    engine = create_engine(
        normalize_database_url(get_settings().database_url), poolclass=NullPool
    )
    with engine.connect() as connection:
        _run(connection)
    engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
