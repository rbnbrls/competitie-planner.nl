"""
File: backend/app/bootstrap/__init__.py
Last updated: 2026-05-01
API version: 0.1.0
Author: Ruben Barels <ruben@rabar.nl>
Changelog:
  - 2026-05-01: Initial metadata header added
"""

from .application import create_app

__all__ = ["create_app"]
