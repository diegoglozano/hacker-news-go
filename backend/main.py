from fastapi import FastAPI, Depends
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


@app.get("/clusters")
async def get_clusters(
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(Cluster, Story.url, Story.score, Story.by)
        .outerjoin(Story, Story.title == Cluster.title)
    )
    return [
        {
            "title": c.title,
            "cluster": c.cluster,
            "x": c.x,
            "y": c.y,
            "url": url,
            "score": score,
            "by": by,
        }
        for c, url, score, by in result.all()
    ]
