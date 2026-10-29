"""create users table

Revision ID: 0001
Revises:
Create Date: 2026-10-29

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel

# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # `alembic upgrade --sql` has no live connection to inspect; emit the fresh-DB path.
    offline = op.get_context().as_sql
    tables = [] if offline else sa.inspect(op.get_bind()).get_table_names()
    if "user" in tables and "users" not in tables:
        # Databases set up before Alembic (via create_all) already hold rows in "user";
        # rename instead of recreating so those accounts survive.
        op.rename_table("user", "users")
        op.drop_index("ix_user_username", table_name="users")
        op.create_index("ix_users_username", "users", ["username"], unique=True)
        return

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("username", sqlmodel.sql.sqltypes.AutoString(length=64), nullable=False),
        sa.Column("password_hash", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column(
            "gender", sa.Enum("male", "female", "other", name="gender"), nullable=False
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_username", "users", ["username"], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_users_username", table_name="users")
    op.drop_table("users")
    # PostgreSQL keeps enum types after the table is gone; drop it so upgrade can rerun.
    sa.Enum(name="gender").drop(op.get_bind(), checkfirst=True)
