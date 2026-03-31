from fastapi import WebSocket
from typing import Dict, List
import asyncio
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # dictionary mapping job_id to a list of active websocket connections
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # lock to prevent race conditions during list modifications
        self.lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, job_id: str):
        await websocket.accept()
        async with self.lock:
            if job_id not in self.active_connections:
                self.active_connections[job_id] = []
            self.active_connections[job_id].append(websocket)
        logger.info(f"WebSocket connected for job {job_id}")

    async def disconnect(self, websocket: WebSocket, job_id: str):
        async with self.lock:
            if job_id in self.active_connections:
                try:
                    self.active_connections[job_id].remove(websocket)
                except ValueError:
                    pass
                if not self.active_connections[job_id]:
                    del self.active_connections[job_id]
        logger.info(f"WebSocket disconnected for job {job_id}")

    async def broadcast_progress(self, job_id: str, status: str, percent: int, details: str = ""):
        message = {
            "type": "progress",
            "job_id": job_id,
            "status": status,
            "percent": percent,
            "details": details
        }
        
        async with self.lock:
            if job_id in self.active_connections:
                # Iterate over a copy to safely handle disconnected sockets
                for connection in list(self.active_connections[job_id]):
                    try:
                        await connection.send_json(message)
                    except Exception as e:
                        logger.warning(f"Failed to send to websocket, removing: {e}")
                        try:
                            self.active_connections[job_id].remove(connection)
                        except ValueError:
                            pass

manager = ConnectionManager()
