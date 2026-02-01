from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
)

class Base(DeclarativeBase):
    pass

class Story(Base):
    __tablename__ = "stories"

    id: Mapped[int] = mapped_column(primary_key=True)
    by: Mapped[str]  # author
    title: Mapped[str]
    text: Mapped[str | None]  # text is optional for link posts
    score: Mapped[int]
    url: Mapped[str | None]  # optional for text posts
    time: Mapped[int]
    descendants: Mapped[int | None]  # comment count
    type: Mapped[str]  # "story", "comment", etc.
