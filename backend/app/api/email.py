from fastapi import APIRouter
from app.models.email import EmailModel
from app.services.email_service import email_service

router = APIRouter(prefix="/api/email", tags=["email"])


@router.post("/send")
async def sendEmail(payload: EmailModel):
    return await email_service.send_email(payload.to, payload.subject, payload.body)
