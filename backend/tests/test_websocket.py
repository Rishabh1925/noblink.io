"""
Integration test for the WebSocket game flow and REST endpoints.

Uses FastAPI's TestClient with mocked Redis and MongoDB
so no external services are required.
"""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import fakeredis.aioredis
import pytest
from bson import ObjectId
from httpx import ASGITransport, AsyncClient

from app import leaderboard


# ── Fixtures ─────────────────────────────────────────────────────────────────


@pytest.fixture(autouse=True)
async def mock_redis(monkeypatch):
    """Replace Redis with fakeredis for all tests."""
    fake = fakeredis.aioredis.FakeRedis(decode_responses=True)

    async def _get_redis():
        return fake

    monkeypatch.setattr(leaderboard, "get_redis", _get_redis)
    # Also patch the leaderboard module import in main
    monkeypatch.setattr("app.leaderboard.get_redis", _get_redis)

    yield fake
    await fake.aclose()


@pytest.fixture(autouse=True)
def mock_db(monkeypatch):
    """
    Mock the database layer so we don't need a real MongoDB.
    The WebSocket handler and REST endpoints that need DB will use mocks.
    """
    from app import database

    # Mock init_db and close_db so lifespan doesn't fail
    monkeypatch.setattr(database, "init_db", AsyncMock())
    monkeypatch.setattr(database, "close_db", AsyncMock())

    # Mock close_redis in leaderboard
    monkeypatch.setattr(leaderboard, "close_redis", AsyncMock())


# ── Helpers ──────────────────────────────────────────────────────────────────


def _open_eye_landmarks() -> dict:
    return {
        "left_eye": [
            {"x": 0.0, "y": 0.0, "z": 0.0},
            {"x": 0.2, "y": 0.15, "z": 0.0},
            {"x": 0.4, "y": 0.15, "z": 0.0},
            {"x": 0.6, "y": 0.0, "z": 0.0},
            {"x": 0.4, "y": -0.15, "z": 0.0},
            {"x": 0.2, "y": -0.15, "z": 0.0},
        ],
        "right_eye": [
            {"x": 0.0, "y": 0.0, "z": 0.0},
            {"x": 0.2, "y": 0.15, "z": 0.0},
            {"x": 0.4, "y": 0.15, "z": 0.0},
            {"x": 0.6, "y": 0.0, "z": 0.0},
            {"x": 0.4, "y": -0.15, "z": 0.0},
            {"x": 0.2, "y": -0.15, "z": 0.0},
        ],
    }


def _closed_eye_landmarks() -> dict:
    return {
        "left_eye": [
            {"x": 0.0, "y": 0.0, "z": 0.0},
            {"x": 0.2, "y": 0.02, "z": 0.0},
            {"x": 0.4, "y": 0.02, "z": 0.0},
            {"x": 0.6, "y": 0.0, "z": 0.0},
            {"x": 0.4, "y": -0.02, "z": 0.0},
            {"x": 0.2, "y": -0.02, "z": 0.0},
        ],
        "right_eye": [
            {"x": 0.0, "y": 0.0, "z": 0.0},
            {"x": 0.2, "y": 0.02, "z": 0.0},
            {"x": 0.4, "y": 0.02, "z": 0.0},
            {"x": 0.6, "y": 0.0, "z": 0.0},
            {"x": 0.4, "y": -0.02, "z": 0.0},
            {"x": 0.2, "y": -0.02, "z": 0.0},
        ],
    }


def _build_mock_db():
    """Build a mock MongoDB database with users and game_sessions collections."""
    mock_user_id = ObjectId()
    mock_session_id = ObjectId()

    mock_users = MagicMock()
    mock_users.find_one = AsyncMock(return_value={
        "_id": mock_user_id,
        "username": "TestPlayer",
        "best_time_ms": 0,
        "total_sessions": 0,
    })
    mock_users.insert_one = AsyncMock()
    mock_users.update_one = AsyncMock()

    mock_sessions = MagicMock()
    mock_insert_result = MagicMock()
    mock_insert_result.inserted_id = mock_session_id
    mock_sessions.insert_one = AsyncMock(return_value=mock_insert_result)
    mock_sessions.update_one = AsyncMock()

    mock_db_instance = MagicMock()
    mock_db_instance.users = mock_users
    mock_db_instance.game_sessions = mock_sessions
    mock_db_instance.command = AsyncMock(return_value={"ok": 1})

    return mock_db_instance, mock_user_id, mock_session_id


# ── REST Endpoint Tests ─────────────────────────────────────────────────────


class TestHealthEndpoint:
    @pytest.mark.asyncio
    async def test_health_returns_200(self):
        from app.main import app

        mock_db_instance, _, _ = _build_mock_db()

        # Patch get_db in the main module (where it was imported)
        with patch("app.main.get_db", return_value=mock_db_instance):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.get("/api/health")
                assert response.status_code == 200
                data = response.json()
                assert "status" in data


class TestLeaderboardEndpoint:
    @pytest.mark.asyncio
    async def test_leaderboard_returns_200(self):
        from app.main import app

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/leaderboard")
            assert response.status_code == 200
            data = response.json()
            assert "entries" in data
            assert "total_players" in data

    @pytest.mark.asyncio
    async def test_leaderboard_with_data(self, mock_redis):
        """Test leaderboard returns data after scores are submitted."""
        await leaderboard.submit_score("user-1", "TestPlayer", 5000)

        from app.main import app

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/leaderboard")
            assert response.status_code == 200
            data = response.json()
            assert len(data["entries"]) == 1
            assert data["entries"][0]["username"] == "TestPlayer"
            assert data["entries"][0]["duration_ms"] == 5000


# ── WebSocket Flow Test ──────────────────────────────────────────────────────


class TestWebSocketFlow:
    def test_full_game_session_blink_detected(self):
        """
        Simulate a complete game session with mocked DB:
        1. Connect
        2. Send START_GAME → receive SESSION_READY
        3. Receive 3x COUNTDOWN
        4. Receive GAME_ACTIVE
        5. Send open-eye frames
        6. Send closed-eye frames → receive GAME_OVER
        """
        from app.main import app
        from fastapi.testclient import TestClient

        mock_db_instance, mock_user_id, _ = _build_mock_db()

        # Patch get_db in BOTH main and websocket_manager modules
        with (
            patch("app.main.get_db", return_value=mock_db_instance),
            patch("app.websocket_manager.get_db", return_value=mock_db_instance),
        ):
            test_client = TestClient(app)
            client_id = str(uuid.uuid4())
            user_id = str(mock_user_id)

            with test_client.websocket_connect(f"/ws/staring-contest/{client_id}") as ws:
                # 1. START_GAME
                ws.send_json({
                    "type": "START_GAME",
                    "user_id": user_id,
                    "username": "TestPlayer",
                })

                # 2. SESSION_READY
                msg = ws.receive_json()
                assert msg["type"] == "SESSION_READY"
                assert "session_id" in msg

                # 3. COUNTDOWN (3, 2, 1)
                for expected_count in (3, 2, 1):
                    msg = ws.receive_json()
                    assert msg["type"] == "COUNTDOWN"
                    assert msg["count"] == expected_count

                # 4. GAME_ACTIVE
                msg = ws.receive_json()
                assert msg["type"] == "GAME_ACTIVE"

                # 5. Send a few open-eye frames
                for i in range(5):
                    ws.send_json({
                        "type": "FRAME",
                        "timestamp": 1700000000000 + i * 33,
                        "landmarks": _open_eye_landmarks(),
                    })

                # Receive EAR updates (sent every 3rd frame)
                msg = ws.receive_json()
                assert msg["type"] == "EAR_UPDATE"
                assert msg["ear"] > 0.20

                # 6. Send closed-eye frames to trigger blink
                for i in range(3):
                    ws.send_json({
                        "type": "FRAME",
                        "timestamp": 1700000000200 + i * 33,
                        "landmarks": _closed_eye_landmarks(),
                    })

                # Should receive GAME_OVER
                # Consume any pending EAR_UPDATE messages first
                game_over_received = False
                for _ in range(10):
                    msg = ws.receive_json()
                    if msg["type"] == "GAME_OVER":
                        game_over_received = True
                        assert msg["reason"] == "blink_detected"
                        assert msg["duration_ms"] >= 0
                        break

                assert game_over_received, "Expected GAME_OVER message"
