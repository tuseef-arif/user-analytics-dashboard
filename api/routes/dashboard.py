from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlmodel import Session, func, select

from api.database import get_session
from api.deps import get_current_user
from api.models import Gender, User
from api.schemas import StatsOut

router = APIRouter(tags=["dashboard"])


@router.get(
    "/stats",
    response_model=StatsOut,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(get_current_user)],
)
def stats(session: Annotated[Session, Depends(get_session)]) -> StatsOut:
    rows = session.exec(
        select(User.gender, func.count(User.id)).group_by(User.gender)
    ).all()
    # GROUP BY omits genders with no users; seed zeros so the shape is stable.
    by_gender = {gender.value: 0 for gender in Gender}
    for gender, count in rows:
        by_gender[gender.value] = count
    return StatsOut(total=sum(by_gender.values()), by_gender=by_gender)
