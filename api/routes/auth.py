from functools import lru_cache
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from api.config import Settings, get_settings
from api.database import get_session
from api.deps import ACCESS_TOKEN_COOKIE, get_current_user
from api.models import User
from api.schemas import LoginIn, RegisterIn, UserOut
from api.security import create_access_token, hash_password, verify_password

router = APIRouter(tags=["auth"])


@lru_cache
def _dummy_hash() -> str:
    # Lazy so cold starts don't pay for a hash that only unknown-user logins need.
    return hash_password("dummy-password-for-timing")


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(data: RegisterIn, session: Annotated[Session, Depends(get_session)]) -> User:
    user = User(
        username=data.username,
        password_hash=hash_password(data.password),
        gender=data.gender,
    )
    session.add(user)
    try:
        session.commit()
    except IntegrityError:
        # The UNIQUE constraint is the source of truth; a pre-check would race.
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Username already taken"
        ) from None
    session.refresh(user)
    return user


@router.post("/login", response_model=UserOut, status_code=status.HTTP_200_OK)
def login(
    data: LoginIn,
    response: Response,
    session: Annotated[Session, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> User:
    user = session.exec(select(User).where(User.username == data.username)).first()
    if user is None:
        # Still pay the argon2 cost so response time doesn't reveal which usernames exist.
        verify_password(data.password, _dummy_hash())
    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    response.set_cookie(
        ACCESS_TOKEN_COOKIE,
        create_access_token(user.id),
        max_age=settings.access_token_expire_minutes * 60,
        path="/",
        secure=settings.cookie_secure,
        httponly=True,
        samesite="lax",
    )
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response, settings: Annotated[Settings, Depends(get_settings)]
) -> None:
    # Browsers only drop the cookie if these attributes match the ones it was set with.
    response.delete_cookie(
        ACCESS_TOKEN_COOKIE,
        path="/",
        secure=settings.cookie_secure,
        httponly=True,
        samesite="lax",
    )


@router.get("/me", response_model=UserOut, status_code=status.HTTP_200_OK)
def me(user: Annotated[User, Depends(get_current_user)]) -> User:
    return user
