from sqlalchemy import Engine
from sqlmodel import SQLModel

from api import models  # noqa: F401  registers tables on SQLModel.metadata
from api.database import get_engine


def create_tables(engine: Engine | None = None) -> None:
    # create_all only issues CREATE for missing tables; it never drops or alters.
    SQLModel.metadata.create_all(engine or get_engine())


def main() -> None:
    create_tables()
    print("Tables created (existing tables left untouched)")


if __name__ == "__main__":
    main()
