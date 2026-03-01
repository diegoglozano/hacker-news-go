from fastapi import FastAPI, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.db.session import get_session
from src.db.tables import Story, Cluster

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://hn.diegoglozano.com"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/stories")
async def get_stories(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(Story)
        .order_by(Story.score.desc())
        .limit(limit)
        .offset(offset)
    )
    stories = result.scalars().all()
    return [
        {
            "id": s.id,
            "by": s.by,
            "title": s.title,
            "text": s.text,
            "score": s.score,
            "url": s.url,
            "time": s.time,
            "descendants": s.descendants,
        }
        for s in stories
    ]


@app.get("/clusters")
async def get_clusters(
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(Cluster))
    clusters = result.scalars().all()
    return [
        {
            "title": c.title,
            "cluster": c.cluster,
            "x": c.x,
            "y": c.y,
        }
        for c in clusters
    ]
