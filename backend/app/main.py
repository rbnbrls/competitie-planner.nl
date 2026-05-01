"""
File: backend/app/main.py
Last updated: 2026-05-01
API version: 0.1.0
Author: Ruben Barels <ruben@rabar.nl>
Changelog:
  - 2026-05-01: Initial metadata header added
"""

from app.bootstrap import create_app
from app.bootstrap.monitoring import setup_sentry
from app.logging_config import setup_logging

setup_logging()
setup_sentry()

app = create_app()
