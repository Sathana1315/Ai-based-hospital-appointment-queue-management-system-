import time
import psutil
from fastapi import APIRouter
from app.database import db
from app.ws_manager import manager

router = APIRouter(tags=["System"])

# Record start time for uptime calculation
START_TIME = time.time()

@router.get("/health")
async def health_check():
    """Basic health check endpoint."""
    return {"status": "ok", "message": "Q-Med Backend is running healthy."}

@router.get("/system")
async def system_metrics():
    """Advanced system metrics endpoint for monitoring."""
    uptime_seconds = int(time.time() - START_TIME)
    
    # DB Latency Check
    db_status = "ok"
    db_latency = 0
    try:
        t0 = time.time()
        await db.command("ping")
        t1 = time.time()
        db_latency = round((t1 - t0) * 1000, 2)
    except Exception:
        db_status = "error"
        db_latency = -1
        
    cpu_usage = psutil.cpu_percent(interval=0.1)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    
    # Total WebSocket connections across all rooms
    total_ws_connections = sum(len(connections) for connections in manager.active_connections.values())
    
    return {
        "status": "ok" if db_status == "ok" else "degraded",
        "uptime_seconds": uptime_seconds,
        "database": {
            "status": db_status,
            "latency_ms": db_latency
        },
        "system": {
            "cpu_usage_percent": cpu_usage,
            "memory_usage_percent": memory.percent,
            "memory_available_mb": round(memory.available / (1024 * 1024), 2),
            "disk_usage_percent": disk.percent
        },
        "websockets": {
            "active_connections": total_ws_connections,
            "active_rooms": len(manager.active_connections)
        }
    }
