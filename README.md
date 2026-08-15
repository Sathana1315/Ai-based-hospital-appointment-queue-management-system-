# Q-Med Hospital Queue Management System
## Version 1.0.0 (Production Release)

Q-Med is an AI-powered Hospital Appointment and Queue Management System designed to streamline patient intake, automate scheduling with Groq LLMs and Faster Whisper, and provide a seamless real-time queue visualization via WebSockets.

### Core Features
- **Smart AI Chatbot:** Voice-to-text integration (Faster Whisper) and conversational AI (Groq) to automate booking and recommend hospitals based on symptoms.
- **Live Queue System:** Real-time queue updates with estimated wait times, synced across Receptionists, Doctors, and Patients via WebSockets.
- **Medical File Uploads:** Attach and view lab reports and prescriptions digitally.
- **Enterprise Security:** JWT Auth, Role-based Access Control (RBAC), Rate Limiting, Audit Logs, and MongoDB Index optimization.
- **Production DevOps:** Fully containerized with Docker, Nginx Proxy, Gzip compression, and GitHub Actions CI/CD pipelines.

### Tech Stack
- **Backend:** FastAPI, Python 3.11, Motor (Async MongoDB), WebSockets
- **Frontend:** React, Vite, Lucide Icons
- **Infrastructure:** Docker, Nginx, GitHub Actions

### Quick Start (Docker)
1. Copy `.env.example` to `.env.production` and fill in secrets.
2. Run `docker-compose up --build -d`
3. Access the app at `http://localhost` (or your configured domain).

For detailed documentation, please refer to the `docs/` folder.
