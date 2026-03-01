import polars as pl
import os
from urllib.parse import urlparse

from sklearn.cluster import HDBSCAN
from sklearn.decomposition import PCA

from fastembed import TextEmbedding


SEED = 42
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL is None:
    raise Exception("DATABASE_URL not available")
POLARS_DB_URL = DATABASE_URL.replace("postgresql+psycopg://", "postgresql://")


model = TextEmbedding("sentence-transformers/all-MiniLM-L6-v2")
hdbscan = HDBSCAN(min_cluster_size=3, min_samples=1)
pca_cluster = PCA(n_components=10, random_state=SEED)
pca_viz = PCA(n_components=2, random_state=SEED)


def extract_domain(url: str | None) -> str | None:
    if not url:
        return None
    return urlparse(url).netloc.removeprefix("www.")


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

    embeddings = list(model.embed(texts))
    clusters = hdbscan.fit_predict(pca_cluster.fit_transform(embeddings))
    coords = pca_viz.fit_transform(embeddings)

    (
        df
        .drop("url")
        .with_columns(
            pl.Series("cluster", clusters).cast(pl.Int8),
            pl.Series("x", coords[:, 0]),
            pl.Series("y", coords[:, 1]),
        )
        .write_database(
            table_name="clusters",
            connection=POLARS_DB_URL,
            if_table_exists="replace",
            engine="sqlalchemy",
        )
    )
