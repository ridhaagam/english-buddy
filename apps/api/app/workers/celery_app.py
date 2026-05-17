from celery import Celery
from app.core.config import settings

celery_app = Celery("englishbuddy", broker=settings.REDIS_URL, backend=settings.REDIS_URL)
celery_app.conf.task_routes = {"app.workers.tasks.*": {"queue": "default"}}
celery_app.conf.task_serializer = "json"
celery_app.conf.result_serializer = "json"
celery_app.conf.accept_content = ["json"]
celery_app.conf.timezone = "UTC"

import app.workers.tasks  # noqa: F401, E402
