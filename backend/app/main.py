from app.bootstrap import create_app
from app.bootstrap.monitoring import setup_sentry
from app.logging_config import setup_logging

setup_logging()
setup_sentry()

app = create_app()
