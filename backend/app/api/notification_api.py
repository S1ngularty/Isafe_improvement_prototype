from fastapi import APIRouter
from app.services.notification import NotificationService
from app.models.notification_model import NotificationModel, BroadcastNotificaitonModel, NotifyContactUserModel

router = APIRouter(prefix="/api/notify", tags=["notification"])

@router.post("/send")
def send_notification(payload: NotificationModel):
    result = NotificationService.send_notification(payload)
    return result

@router.post("/all-users")
def notify_all_users(payload:BroadcastNotificaitonModel):
    result = NotificationService.send_notificaiton_to_all_users(payload)
    return result

@router.post("notify-contacts")
def notify_contacts(payload:NotifyContactUserModel):
    return NotificationService.send_alert_notification(payload)