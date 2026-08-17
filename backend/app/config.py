import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    MONGODB_URI: str
    GROQ_API_KEY: str
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    PORT: int = 8000

    # Demo Environment Configuration
    DEMO_MODE: bool = True
    DEMO_SIMULATION_ENABLED: bool = True
    DEMO_SIMULATION_INTERVAL_SECONDS: int = 25
    DEMO_CONSULTATION_DURATION_SECONDS: int = 40
    DEMO_PATIENT_USERNAME: str = "patient_demo"
    DEMO_DOCTOR_USERNAME: str = "dr_smith_central"
    DEMO_RECEPTIONIST_USERNAME: str = "receptionist"
    DEMO_ADMIN_USERNAME: str = "admin"

    # Google OAuth Configuration
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        extra="ignore"
    )

settings = Settings()

