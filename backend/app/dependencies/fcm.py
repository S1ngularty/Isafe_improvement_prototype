from functools import lru_cache

from app.services.notification import NotificationService

@lru_cache
def get_fcm_service()->NotificationService:
    return NotificationService()