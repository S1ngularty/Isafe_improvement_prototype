from fastapi import APIRouter
from app.services.fcm_service import NotificationService
from app.models.notification_model import NotificationModel

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.post("/send")
def send_notification(payload: NotificationModel):
    result = NotificationService.send_notification(payload)
    return result