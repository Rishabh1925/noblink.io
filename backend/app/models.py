"""
Document Models — MongoDB document schemas for User and GameSession.
"""

from __future__ import annotations

import enum
from datetime import datetime, timezone
from typing import Any

from bson import ObjectId


# ── Enums ────────────────────────────────────────────────────────────────────


class SessionStatus(str, enum.Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    CHEATING_DETECTED = "cheating_detected"


# ── Document Helpers ─────────────────────────────────────────────────────────


def new_user_doc(
    username: str,
    email: str | None = None,
    hashed_password: str | None = None,
) -> dict[str, Any]:
    """Create a new user document dict for MongoDB insertion."""
    doc: dict[str, Any] = {
        "username": username,
        "created_at": datetime.now(timezone.utc),
        "total_sessions": 0,
        "best_time_ms": 0,
    }
    if email is not None:
        doc["email"] = email
    if hashed_password is not None:
        doc["hashed_password"] = hashed_password
    return doc


def new_game_session_doc(
    user_id: str,
    username: str,
) -> dict[str, Any]:
    """Create a new game session document dict for MongoDB insertion."""
    return {
        "user_id": user_id,
        "username": username,
        "started_at": datetime.now(timezone.utc),
        "ended_at": None,
        "duration_ms": 0,
        "status": SessionStatus.ACTIVE.value,
        "final_ear": None,
        "total_frames": 0,
    }


def serialize_doc(doc: dict[str, Any]) -> dict[str, Any]:
    """Convert MongoDB document for API response (ObjectId → str)."""
    if doc is None:
        return doc
    result = dict(doc)
    if "_id" in result:
        result["id"] = str(result.pop("_id"))
    return result
