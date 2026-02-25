import marimo

__generated_with = "0.19.7"
app = marimo.App(width="medium")


@app.cell
def _():
    import marimo as mo
    import polars as pl

    from sklearn.cluster import KMeans
    from sklearn.decomposition import PCA

    from fastembed import TextEmbedding

    from pathlib import Path
    return KMeans, PCA, Path, TextEmbedding, pl


@app.cell
def _():
    SEED = 42
    return (SEED,)


@app.cell
def _(Path):
    DATA_PATH = Path("data")
    list(DATA_PATH.glob("*"))
    return (DATA_PATH,)


@app.cell
def _(KMeans, PCA, SEED, TextEmbedding):
    model = TextEmbedding("sentence-transformers/all-MiniLM-L6-v2")
    kmeans = KMeans(n_clusters=5, random_state=SEED)
    pca = PCA(n_components=2, random_state=SEED)
    return kmeans, model, pca


@app.cell
def _(DATA_PATH, kmeans, model, pca, pl):
    df = (
        pl
        .read_csv(DATA_PATH / "stories.csv")
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
    )
    print(df.shape)
    df.head()
    return (df,)


@app.cell
def _(df):
    (
        df
        .group_by("cluster")
        .agg("title")
        .sort("cluster")
        .partition_by("cluster", include_key=False)
    )
    return


if __name__ == "__main__":
    app.run()
