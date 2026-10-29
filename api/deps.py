from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlmodel import Session

from api.database import get_session
from api.models import User
from api.security import decode_access_token

ACCESS_TOKEN_COOKIE = "access_token"


def get_current_user(
    request: Request, session: Annotated[Session, Depends(get_session)]
) -> User:
    token = request.cookies.get(ACCESS_TOKEN_COOKIE)
    user_id = decode_access_token(token) if token else None
    # A valid token can outlive its user, so the DB lookup is part of authentication.
    user = session.get(User, user_id) if user_id is not None else None
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
        )
    return user
