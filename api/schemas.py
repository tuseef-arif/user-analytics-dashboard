import re
from datetime import datetime
from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, StringConstraints

from api.models import Gender


_USERNAME_CHARS = re.compile(r"[a-z0-9._+@-]+")


def _check_username_chars(value: str) -> str:
    # Runs after strip/lowercase (StringConstraints' own pattern runs before them).
    # ASCII only, so look-alike Unicode, emoji and inner spaces can't mimic other names.
    if not _USERNAME_CHARS.fullmatch(value):
        raise ValueError(
            "may only contain letters, digits and the characters . _ + @ -"
        )
    return value


PASSWORD_STRENGTH_MESSAGE = (
    "Password must include a letter, a number and a special character."
)


def _check_password_strength(value: str) -> str:
    # Mirrors validateRegister in src/lib/validation.ts. Whitespace is allowed but
    # doesn't count as the special character.
    has_letter = any(c.isalpha() for c in value)
    has_number = any(c in "0123456789" for c in value)
    has_special = any(not c.isalnum() and not c.isspace() for c in value)
    if not (has_letter and has_number and has_special):
        raise ValueError(PASSWORD_STRENGTH_MESSAGE)
    return value


class RegisterIn(BaseModel):
    username: Annotated[
        str,
        StringConstraints(
            strip_whitespace=True, to_lower=True, min_length=3, max_length=64
        ),
        AfterValidator(_check_username_chars),
    ]
    password: Annotated[
        str,
        Field(min_length=8, max_length=128),
        AfterValidator(_check_password_strength),
    ]
    gender: Gender


class LoginIn(BaseModel):
    # No register-policy minimums here, so errors don't leak the password policy.
    username: Annotated[
        str, StringConstraints(strip_whitespace=True, to_lower=True, min_length=1)
    ]
    # Same cap as register: argon2 hashes the whole input, so unbounded input is a DoS.
    password: str = Field(min_length=1, max_length=128)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    gender: Gender
    created_at: datetime


class StatsOut(BaseModel):
    total: int
    by_gender: dict[str, int]
