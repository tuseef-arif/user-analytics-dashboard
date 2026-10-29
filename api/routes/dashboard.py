from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlmodel import Session

from api.database import get_session
from api.deps import get_current_user
from api.schemas import StatsOut
from api.services.stats import get_stats

router = APIRouter(tags=["dashboard"])


@router.get(
    "/stats",
    response_model=StatsOut,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(get_current_user)],
)
def stats(session: Annotated[Session, Depends(get_session)]) -> StatsOut:
    return get_stats(session)
