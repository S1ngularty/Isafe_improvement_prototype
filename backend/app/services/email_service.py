import os
from email.message import EmailMessage

import aiosmtplib
from dotenv import load_dotenv

load_dotenv()

GMAIL_EMAIL = os.getenv("GMAIL_EMAIL")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD")


class EmailService:
    async def send_email(self, to, subject, body):
        if not GMAIL_EMAIL or not GMAIL_APP_PASSWORD:
            raise RuntimeError("GMAIL_EMAIL and GMAIL_APP_PASSWORD must be set")

        message = EmailMessage()
        message["From"] = GMAIL_EMAIL
        message["To"] = str(to)
        message["Subject"] = subject
        message.set_content(body)

        await aiosmtplib.send(
            message,
            hostname="smtp.gmail.com",
            port=587,
            start_tls=True,
            username=GMAIL_EMAIL,
            password=GMAIL_APP_PASSWORD,
        )

        return {"success": True, "message": "Email sent"}


email_service = EmailService()