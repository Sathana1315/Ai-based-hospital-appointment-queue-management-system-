from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import logging
from logging.handlers import RotatingFileHandler
from app.database import ping_database, setup_indexes
from app.routes import authentication, patients, hospitals, doctors, appointments, queues, ai, search, files, settings
from app.routes import notifications, admin, websockets, system
from app.middleware import RateLimitMiddleware, SecurityHeadersMiddleware, AuditLoggingMiddleware

app = FastAPI(
    title="AI-Based Hospital Appointment & Queue Management System API",
    version="1.0.0",
    description="Final production-ready backend for Q-Med Hospital Queue System"
)

# Setup Logging
os.makedirs("logs", exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        RotatingFileHandler("logs/app.log", maxBytes=5000000, backupCount=5),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("qmed_backend")

# Add Middlewares (Order matters: outermost first)
app.add_middleware(AuditLoggingMiddleware)
app.add_middleware(RateLimitMiddleware, max_requests=100, window_seconds=60)
app.add_middleware(SecurityHeadersMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Serve static files for medical uploads
os.makedirs("uploads/medical_files", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

from app.demo_simulation import simulation_engine

@app.on_event("startup")
async def startup_db_client():
    await ping_database()
    await setup_indexes()
    await simulation_engine.start()

@app.on_event("shutdown")
async def shutdown_db_client():
    await simulation_engine.stop()

# Core routers
app.include_router(authentication.router)
app.include_router(patients.router)
app.include_router(hospitals.router)
app.include_router(doctors.router)
app.include_router(appointments.router)
app.include_router(queues.router)
app.include_router(ai.router)

# Phase 3 new routers
app.include_router(notifications.router)
app.include_router(admin.router)

# Phase 4 new routers
app.include_router(websockets.router)
app.include_router(search.router)
app.include_router(files.router)
app.include_router(settings.router)
app.include_router(system.router)

@app.get("/")
async def root():
    return {
        "status": "online",
        "version": "2.0.0",
        "service": "Q-Med Hospital Appointment & Queue Management System API",
        "docs_url": "/docs"
    }
