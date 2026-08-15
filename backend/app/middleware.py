import time
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from collections import defaultdict
import datetime
from app.database import audit_logs_collection

# Simple In-Memory Rate Limiter (Token Bucket simplified to requests per minute)
class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_requests: int = 100, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.ip_records = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        
        # Clean up old records
        self.ip_records[client_ip] = [t for t in self.ip_records[client_ip] if now - t < self.window_seconds]
        
        if len(self.ip_records[client_ip]) >= self.max_requests:
            return Response("Too Many Requests", status_code=429)
            
        self.ip_records[client_ip].append(now)
        response = await call_next(request)
        return response

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Content-Security-Policy"] = "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:;"
        return response

class AuditLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        method = request.method
        path = request.url.path
        
        # Only log mutating actions for audit
        if method in ["POST", "PUT", "DELETE"]:
            client_ip = request.client.host if request.client else "unknown"
            
            # Start timer
            start_time = time.time()
            response = await call_next(request)
            process_time = time.time() - start_time
            
            # Fire and forget logging (could be optimized with background tasks, but keep it simple here)
            log_entry = {
                "timestamp": datetime.datetime.now(datetime.timezone.utc),
                "method": method,
                "path": path,
                "ip": client_ip,
                "status_code": response.status_code,
                "process_time_ms": int(process_time * 1000)
            }
            # Add to asyncio event loop without awaiting to not block response
            import asyncio
            asyncio.ensure_future(audit_logs_collection.insert_one(log_entry))
            
            return response
            
        return await call_next(request)
