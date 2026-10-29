import os
import uuid

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.pool import NullPool
from sqlmodel import Session, create_engine, delete

from api.database import normalize_database_url
from api.init_db import create_tables
from api.models import Gender, User
from api.security import hash_password

TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL")

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(not TEST_DATABASE_URL, reason="TEST_DATABASE_URL not set"),
]


def test_postgres_insert_and_unique_username() -> None:
    # Own engine so the conftest SQLite DATABASE_URL never applies here.
    engine = create_engine(normalize_database_url(TEST_DATABASE_URL), poolclass=NullPool)
    username = f"itest-{uuid.uuid4().hex[:12]}"
    try:
        create_tables(engine)
        with Session(engine) as session:
            user = User(
                username=username,
                password_hash=hash_password("Password123@"),
                gender=Gender.other,
            )
            session.add(user)
            session.commit()
            assert user.id is not None

            session.add(User(username=username, password_hash="h", gender=Gender.male))
            with pytest.raises(IntegrityError):
                session.commit()
            session.rollback()
    finally:
        # Delete only the rows this test created; never drop tables or touch others.
        with Session(engine) as session:
            session.exec(delete(User).where(User.username == username))
            session.commit()
        engine.dispose()
