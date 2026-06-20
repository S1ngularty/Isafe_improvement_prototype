from pathlib import Path

import firebase_admin
from firebase_admin import credentials

from app.core.config import settings

def initialize_firebase():
    if firebase_admin._apps:
        return firebase_admin.get_app()
    
    service_account=Path(settings.firebase_service_account_path)

    if not service_account.exists():
        raise FileNotFoundError(
            f"Firebase service account not found: {service_account}"
        )   
    
    cred = credentials.Certificate(str(service_account))

    return firebase_admin.initialize_app(cred)
    