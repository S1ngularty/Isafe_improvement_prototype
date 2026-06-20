from pathlib import Path

from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    firebase_service_account_path:str=str(
        Path(__file__).resolve().parents[2] / "FIREBASE_SERVICE_ACCOUNT.json"
    )

    firebase_project_id:str | None = None

    class Config:
        env_file=".env"

settings = Settings()