"""
Database — async MongoDB client via motor.
"""

from __future__ import annotations

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import settings

# ── Client ───────────────────────────────────────────────────────────────────

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


def get_db() -> AsyncIOMotorDatabase:
    """Return the shared MongoDB database instance."""
    if _db is None:
        raise RuntimeError("Database not initialised — call init_db() first")
    return _db


# ── Lifecycle ────────────────────────────────────────────────────────────────


async def init_db() -> None:
    """
    Initialise the MongoDB connection and create indexes.

    Called once at application startup.
    """
    global _client, _db

    _client = AsyncIOMotorClient(settings.mongodb_url)
    _db = _client[settings.mongodb_db_name]

    # Create indexes (idempotent)
    await _db.users.create_index("username", unique=True)
    await _db.users.create_index(
        "email",
        unique=True,
        partialFilterExpression={"email": {"$exists": True}},
    )
    await _db.game_sessions.create_index("user_id")
    await _db.game_sessions.create_index("started_at")


async def close_db() -> None:
    """Close the MongoDB connection."""
    global _client, _db
    if _client is not None:
        _client.close()
        _client = None
        _db = None
