import asyncio
import numpy as np
import polars as pl
import os
from urllib.parse import urlparse

from openai import AsyncOpenAI
from sklearn.cluster import HDBSCAN
from sklearn.decomposition import PCA, TruncatedSVD
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import normalize

from fastembed import TextEmbedding


SEED = 42
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL is None:
    raise Exception("DATABASE_URL not available")
POLARS_DB_URL = DATABASE_URL.replace("postgresql+psycopg://", "postgresql://")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if OPENAI_API_KEY is None:
    raise Exception("OPENAI_API_KEY not available")

openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)

model = TextEmbedding("sentence-transformers/all-MiniLM-L6-v2")
tfidf = TfidfVectorizer()
svd = TruncatedSVD(n_components=15, random_state=SEED)
pca_cluster = PCA(n_components=15, random_state=SEED)
pca_viz = PCA(n_components=2, random_state=SEED)
hdbscan = HDBSCAN(min_cluster_size=3, min_samples=1)


def extract_domain(url: str | None) -> str | None:
    if not url:
        return None
    return urlparse(url).netloc.removeprefix("www.")


async def label_cluster(cluster_id: int, titles: list[str]) -> tuple[int, str]:
    titles_str = "\n".join(f"- {t}" for t in titles)
    response = await openai_client.chat.completions.create(
        model="gpt-5-mini",
        messages=[
            {
                "role": "user",
                "content": (
                    "Here are some Hacker News story titles from the same topic cluster:\n"
                    f"{titles_str}\n\n"
                    "Give a short 2-4 word label that describes the common topic. "
                    "Reply with only the label, nothing else."
                ),
            }
        ],
        max_completion_tokens=16,
        temperature=0,
    )
    label = response.choices[0].message.content.strip()
    return cluster_id, label


async def main():
    df = pl.read_database_uri(
        query="""
            SELECT id, title, url
            FROM stories
        """,
        uri=POLARS_DB_URL,
        engine="connectorx",
    )

    texts = [
        f"{extract_domain(row['url'])}: {row['title']}" if row['url'] else row['title']
        for row in df.iter_rows(named=True)
    ]

    tfidf_features = normalize(svd.fit_transform(tfidf.fit_transform(texts)))
    emb_features = normalize(pca_cluster.fit_transform(list(model.embed(texts))))
    features = np.hstack([tfidf_features, emb_features])

    clusters = hdbscan.fit_predict(features)
    coords = pca_viz.fit_transform(features)

    df = df.with_columns(
        pl.Series("cluster", clusters).cast(pl.Int8),
        pl.Series("x", coords[:, 0]),
        pl.Series("y", coords[:, 1]),
    )

    # Label each real cluster in parallel, noise (-1) gets "Other"
    cluster_titles = (
        df.filter(pl.col("cluster") != -1)
        .group_by("cluster")
        .agg(pl.col("title"))
    )
    labels: dict[int, str] = {-1: "Other"}
    results = await asyncio.gather(*[
        label_cluster(row["cluster"], row["title"])
        for row in cluster_titles.iter_rows(named=True)
    ])
    labels.update(results)

    (
        df
        .drop("url")
        .with_columns(
            pl.col("cluster").replace(labels).alias("label"),
        )
        .write_database(
            table_name="clusters",
            connection=POLARS_DB_URL,
            if_table_exists="replace",
            engine="sqlalchemy",
        )
    )
