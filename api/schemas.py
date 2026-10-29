from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from api.models import Gender


class RegisterIn(BaseModel):
    username: Annotated[
        str,
        StringConstraints(
            strip_whitespace=True, to_lower=True, min_length=3, max_length=64
        ),
    ]
    password: str = Field(min_length=8, max_length=128)
    gender: Gender


class LoginIn(BaseModel):
    # Only non-empty checks: enforcing the register policy here would leak it in errors.
    username: Annotated[
        str, StringConstraints(strip_whitespace=True, to_lower=True, min_length=1)
    ]
    password: str = Field(min_length=1)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    gender: Gender
    created_at: datetime


class StatsOut(BaseModel):
    total: int
    by_gender: dict[str, int]
