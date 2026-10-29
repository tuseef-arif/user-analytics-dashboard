from sqlmodel import Session, func, select

from api.models import Gender, User
from api.schemas import StatsOut


def get_stats(session: Session) -> StatsOut:
    rows = session.exec(
        select(User.gender, func.count(User.id)).group_by(User.gender)
    ).all()
    # GROUP BY omits genders with no users; seed zeros so the shape is stable.
    by_gender = {gender.value: 0 for gender in Gender}
    for gender, count in rows:
        by_gender[gender.value] = count
    return StatsOut(total=sum(by_gender.values()), by_gender=by_gender)
