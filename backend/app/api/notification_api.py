from fastapi import APIRouter
from app.services.notification import NotificationService
from app.models.notification_model import NotificationModel, BroadcastNotificaitonModel

router = APIRouter()

@router.post("/send")
def send_notification(payload: NotificationModel):
    result = NotificationService.send_notification(payload)
    return result

@router.post("/all-users")
def notify_all_users(payload:BroadcastNotificaitonModel):
    result = NotificationService.send_notificaiton_to_all_users(payload)
    return result