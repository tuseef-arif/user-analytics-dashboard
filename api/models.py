from datetime import UTC, datetime
from enum import Enum

from sqlalchemy import DateTime
from sqlmodel import Field, SQLModel


class Gender(str, Enum):
    male = "male"
    female = "female"
    other = "other"


class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    username: str = Field(max_length=64, unique=True, index=True)
    password_hash: str
    gender: Gender
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC),
        sa_type=DateTime(timezone=True),
    )
