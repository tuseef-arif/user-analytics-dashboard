from collections.abc import Callable
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import Engine

ALEMBIC_INI = Path(__file__).resolve().parents[1] / "alembic.ini"


def run_alembic(engine: Engine, cmd: Callable[..., object], *args: str) -> None:
    with engine.begin() as connection:
        config = Config(ALEMBIC_INI)
        # migrations/env.py uses this connection instead of DATABASE_URL.
        config.attributes["connection"] = connection
        cmd(config, *args)


def upgrade_head(engine: Engine) -> None:
    run_alembic(engine, command.upgrade, "head")
