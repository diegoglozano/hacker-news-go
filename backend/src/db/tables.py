from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Story(Base):
    __tablename__ = "stories"

    id: Mapped[int] = mapped_column(primary_key=True)
    by: Mapped[str]
    title: Mapped[str]
    text: Mapped[str | None]
    score: Mapped[int]
    url: Mapped[str | None]
    time: Mapped[int]
    descendants: Mapped[int | None]


class Cluster(Base):
    __tablename__ = "clusters"

    title: Mapped[str] = mapped_column(primary_key=True)
    cluster: Mapped[int]
    x: Mapped[float]
    y: Mapped[float]
