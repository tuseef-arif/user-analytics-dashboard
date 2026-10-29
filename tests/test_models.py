import pytest
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from api.models import Gender, User


def test_user_saved_and_read_back(session: Session) -> None:
    session.add(User(username="testuser", password_hash="h", gender=Gender.female))
    session.commit()

    user = session.exec(select(User).where(User.username == "testuser")).one()
    assert user.id is not None
    assert user.password_hash == "h"
    assert user.gender is Gender.female


def test_duplicate_username_raises(session: Session) -> None:
    session.add(User(username="testuser", password_hash="h", gender=Gender.male))
    session.commit()
    session.add(User(username="testuser", password_hash="h2", gender=Gender.other))
    with pytest.raises(IntegrityError):
        session.commit()


def test_created_at_is_set_and_timezone_aware(session: Session) -> None:
    user = User(username="testuser", password_hash="h", gender=Gender.male)
    assert user.created_at.tzinfo is not None

    session.add(user)
    session.commit()
    session.refresh(user)
    assert user.created_at is not None
    # SQLite drops tzinfo on read, so check the column maps to timestamptz on Postgres.
    assert User.__table__.c.created_at.type.timezone is True
