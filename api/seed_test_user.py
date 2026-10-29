from sqlmodel import Session, select

from api.database import get_engine
from api.models import Gender, User
from api.security import hash_password

# Public demo account documented in the README, so these are not secrets.
TEST_USERNAME = "testuser@email.com"
TEST_PASSWORD = "Password123@"


def seed_test_user(session: Session) -> bool:
    if session.exec(select(User).where(User.username == TEST_USERNAME)).first():
        return False
    session.add(
        User(
            username=TEST_USERNAME,
            password_hash=hash_password(TEST_PASSWORD),
            gender=Gender.male,
        )
    )
    session.commit()
    return True


def main() -> None:
    with Session(get_engine()) as session:
        created = seed_test_user(session)
    print(f"Test user {TEST_USERNAME} {'created' if created else 'already exists'}")


if __name__ == "__main__":
    main()
