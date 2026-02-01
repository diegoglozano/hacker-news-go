import asyncio
import os

from sqlalchemy.ext.asyncio import (
    create_async_engine,
    async_sessionmaker,
)
from aiohttp import ClientSession

from src.db.tables import (
    Story,
)


DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL is None:
    raise Exception("DATABASE_URL not available")

URL = "https://hacker-news.firebaseio.com/v0/"

async def get_item(session: ClientSession, item: int):
    async with session.get(f"{URL}/item/{item}.json") as response:
       return await response.json()

async def get_all_items(items: list[int]):
    async with ClientSession() as session:
        tasks = [get_item(session, item) for item in items]
        return await asyncio.gather(*tasks)

async def main():
    engine = create_async_engine(DATABASE_URL)
    AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

    async with ClientSession() as session:
        async with session.get(f"{URL}topstories.json") as resp:
            top_stories = await resp.json()

    all_items = await get_all_items(
        items=top_stories[:2],
    )
    async with AsyncSessionLocal() as session:
        story_fields = {c.name for c in Story.__table__.columns}
        stories = [
            Story(**{k: v for k, v in item.items() if k in story_fields})
            for item in all_items
            if item and item.get("type") == "story"
        ]

        session.add_all(stories)
        await session.commit()

if __name__ == "__main__":
    asyncio.run(main())
