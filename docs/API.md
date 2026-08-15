# API Documentation

The Q-Med API is built with FastAPI. Complete interactive documentation is automatically generated.

## Accessing the Swagger UI
When the backend is running, navigate to:
`http://localhost:8000/docs`

## Core Endpoints

### 1. Authentication
- `POST /auth/register`: Register a new patient/user.
- `POST /auth/login`: Authenticate and receive a JWT.
- `POST /auth/refresh`: Refresh an expired JWT.

### 2. Appointments & Queues
- `POST /appointments/request`: Patient requests an appointment slot.
- `GET /queues/live/{doctor_id}`: Fetch the live status of a doctor's queue (used heavily by WebSockets).
- `POST /queues/next`: Receptionist or Doctor calls the next patient.
- `POST /appointments/prescribe/{appointment_id}`: Doctor submits a prescription and completes the visit.

### 3. Medical Files
- `POST /files/upload`: Securely upload a medical document (multipart/form-data).

### 4. System
- `GET /system/health`: Basic health check.
- `GET /system/system`: In-depth server metrics (CPU, RAM, WebSocket counts, DB Latency).

## Authentication Method
All protected routes require a Bearer token in the `Authorization` header:
`Authorization: Bearer <your_jwt_token>`
