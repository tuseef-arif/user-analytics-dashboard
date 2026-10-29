from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlmodel import Session

from api.config import Settings, get_settings
from api.database import get_session
from api.deps import ACCESS_TOKEN_COOKIE, get_current_user
from api.models import User
from api.schemas import LoginIn, RegisterIn, UserOut
from api.security import create_access_token
from api.services.users import UsernameTakenError, authenticate, create_user

router = APIRouter(tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(data: RegisterIn, session: Annotated[Session, Depends(get_session)]) -> User:
    try:
        return create_user(session, data.username, data.password, data.gender)
    except UsernameTakenError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Username already taken"
        ) from None


@router.post("/login", response_model=UserOut, status_code=status.HTTP_200_OK)
def login(
    data: LoginIn,
    response: Response,
    session: Annotated[Session, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> User:
    user = authenticate(session, data.username, data.password)
    if user is None:
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
