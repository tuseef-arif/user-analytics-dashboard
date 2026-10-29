from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session

from api.database import get_session
from api.models import User
from api.schemas import RegisterIn, UserOut
from api.security import hash_password

router = APIRouter(tags=["auth"])


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
