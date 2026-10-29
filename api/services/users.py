from functools import lru_cache

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from api.models import Gender, User
from api.security import hash_password, verify_password


class UsernameTakenError(Exception):
    pass


@lru_cache
def _dummy_hash() -> str:
    # Lazy so cold starts don't pay for a hash that only unknown-user logins need.
    return hash_password("dummy-password-for-timing")


def create_user(session: Session, username: str, password: str, gender: Gender) -> User:
    user = User(username=username, password_hash=hash_password(password), gender=gender)
    session.add(user)
    try:
        session.commit()
    except IntegrityError:
        # The UNIQUE constraint is the source of truth; a pre-check would race.
        session.rollback()
        raise UsernameTakenError from None
    session.refresh(user)
    return user


def authenticate(session: Session, username: str, password: str) -> User | None:
    user = session.exec(select(User).where(User.username == username)).first()
    if user is None:
        # Still pay the argon2 cost so response time doesn't reveal which usernames exist.
        verify_password(password, _dummy_hash())
        return None
    return user if verify_password(password, user.password_hash) else None


def get_user(session: Session, user_id: int) -> User | None:
    return session.get(User, user_id)
