"""
File: backend/app/services/audit.py
Last updated: 2026-05-01
API version: 0.1.0
Author: Ruben Barels <ruben@rabar.nl>
Changelog:
  - 2026-05-01: Initial metadata header added
"""

import structlog

"""
Audit logging service.

Emits structured audit events via structlog (stdout). Log retention is
configured at the infrastructure level — set Docker/Coolify log rotation
to match your policy (see AUDIT_LOG_RETENTION_DAYS in config).

All audit events carry audit=True so they can be filtered in any log
aggregator (Loki, CloudWatch, Datadog, etc.).
"""

_logger = structlog.get_logger()


def log_audit(
    action: str,
    *,
    actor_id: str | None = None,
    actor_email: str | None = None,
    target_type: str | None = None,
    target_id: str | None = None,
    club_id: str | None = None,
    result: str = "success",
    **details,
) -> None:
    """
    Emit a structured audit log event.

    Args:
        action:       Dot-namespaced action (e.g. "auth.login_failure", "user.update").
        actor_id:     UUID of the user performing the action, if known.
        actor_email:  Email of the actor, for human-readable tracing.
        target_type:  Resource type affected (e.g. "user", "club", "ronde").
        target_id:    UUID of the affected resource.
        club_id:      Club (tenant) context, if applicable.
        result:       "success" or "failure".
        **details:    Any additional key/value context.
    """
    _logger.info(
        action,
        audit=True,
        actor_id=actor_id,
        actor_email=actor_email,
        target_type=target_type,
        target_id=target_id,
        club_id=club_id,
        result=result,
        **details,
    )
