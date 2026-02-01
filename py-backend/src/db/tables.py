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
    name: Mapped[str]
    text: Mapped[str]
    score: Mapped[int]
    url: Mapped[str]
    time: Mapped[int]
