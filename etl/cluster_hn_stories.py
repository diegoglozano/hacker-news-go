import polars as pl
import os

from sklearn.cluster import KMeans
from sklearn.decomposition import PCA

from fastembed import TextEmbedding


SEED = 42
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL is None:
    raise Exception("DATABASE_URL not available")

model = TextEmbedding("sentence-transformers/all-MiniLM-L6-v2")
kmeans = KMeans(n_clusters=5, random_state=SEED)
pca = PCA(n_components=2, random_state=SEED)

async def main():
    (
        pl
        .read_database_uri(
            query="""
                SELECT title
                FROM stories
            """,
            uri=DATABASE_URL,
            # engine="adbc",
        )
        .with_columns(
            pl
            .col("title")
            .map_batches(
                lambda x: pl.Series(model.embed(x)),
                return_dtype=pl.Array(pl.Float64, model.embedding_size),
            )
            .alias("embedding")
        )
        .with_columns(
            pl
            .col("embedding")
            .map_batches(
                lambda x: kmeans.fit_predict(x),
                return_dtype=pl.Int8,
            )
            .alias("cluster"),
            pl
            .col("embedding")
            .map_batches(
                lambda x: pca.fit_transform(x),
                return_dtype=pl.Array(pl.Float64, pca.n_components)
            )
            .alias("embedding_2"),
        )
        .write_database(
            table_name="clusters",
            connection=DATABASE_URL,
            if_table_exists="replace",
            # engine="adbc",
        )
    )
