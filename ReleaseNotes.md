# Q-Med v1.0.0 Release Notes
**Date:** July 2026

We are thrilled to announce the Version 1.0.0 production release of Q-Med!

## Highlights
- **Full Dockerization:** Easily deploy the entire stack using Docker Compose.
- **Enterprise Security:** JWT-based Auth, Audit Logging, and IP-based Rate Limiting built into custom FastAPI middlewares.
- **AI-Powered Workflows:** Groq LLM + Faster Whisper integration allowing patients to book appointments using just their voice.
- **Live Queue System:** Real-time WebSockets keep patients, receptionists, and doctors perfectly synced without refreshing.
- **Medical File Support:** Doctors can now attach X-Rays and Lab Reports directly to prescriptions.

## Known Limitations
- AI Voice booking currently performs best in quiet environments. Heavy background noise may lower transcription accuracy.
- Maximum file upload size is currently capped at 10MB per Nginx configuration.

## Future Roadmap
- Integration with third-party billing and insurance APIs.
- Mobile App wrappers using React Native.
- Multi-region database sharding for global scale.
