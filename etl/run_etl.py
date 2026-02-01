from fetch_hn_stories import main as main_fetch_hn_stories
from prefect import flow, task
from loguru import logger

@task
async def fetch_hn_stories():
    logger.info("starting fetch_hn_stories prefect task")
    await main_fetch_hn_stories()
    logger.info("ending fetch_hn_stories prefect task")

@flow
async def hn_pipeline():
    await fetch_hn_stories()

if __name__ == "__main__":
    hn_pipeline.serve(
        name="hn-pipeline",
        cron="0 0 * * *",
    )
