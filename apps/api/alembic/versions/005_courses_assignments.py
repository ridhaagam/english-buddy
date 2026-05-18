"""Add courses and module assignment tables

Revision ID: 005
Revises: 004
Create Date: 2026-05-18
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "english_courses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("english_users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )

    op.create_table(
        "english_course_modules",
        sa.Column("course_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("english_courses.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("module_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("english_modules.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("added_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_english_course_modules_module_id", "english_course_modules", ["module_id"])

    op.create_table(
        "english_course_users",
        sa.Column("course_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("english_courses.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("english_users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("assigned_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("assigned_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("english_users.id"), nullable=False),
    )
    op.create_index("ix_english_course_users_user_id", "english_course_users", ["user_id"])

    op.create_table(
        "english_module_assignments",
        sa.Column("module_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("english_modules.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("english_users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("assigned_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("assigned_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("english_users.id"), nullable=False),
    )
    op.create_index("ix_english_module_assignments_user_id", "english_module_assignments", ["user_id"])


def downgrade() -> None:
    op.drop_table("english_module_assignments")
    op.drop_table("english_course_users")
    op.drop_table("english_course_modules")
    op.drop_table("english_courses")
