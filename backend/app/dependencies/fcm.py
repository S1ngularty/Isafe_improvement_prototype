from functools import lru_cache

from app.services.fcm_service import FCMService

@lru_cache
def get_fcm_service()->FCMService:
    return FCMService()