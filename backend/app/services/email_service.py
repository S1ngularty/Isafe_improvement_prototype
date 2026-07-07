# app/services/email_service.py
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
        message["From"] = GMAIL_EMAIL  # Fixed: Use "From" not "FROM"
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
    
    async def send_email_verification(self, to, subject, body):
        if not GMAIL_APP_PASSWORD or not GMAIL_EMAIL:
            raise RuntimeError("GMAIL_EMAIL and GMAIL_APP_PASSWORD must be set")
        
        message = EmailMessage()
        message["From"] = GMAIL_EMAIL  # Fixed: Use "From" not "FROM"
        message["To"] = str(to)
        message["Subject"] = subject
        message.set_content(body, subtype="html") 

        await aiosmtplib.send(
            message,
            hostname="smtp.gmail.com",
            port=587,
            start_tls=True,
            username=GMAIL_EMAIL,
            password=GMAIL_APP_PASSWORD
        )

        return {"success": True, "message": "Email sent"}

    def generate_verification_email_body(self, username, verification_code):
        """Generate a simple HTML email body for email verification."""
        return f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email</title>
</head>
<body style="margin:0;padding:0;background:#f8f8f8;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">

<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding:40px 20px;">
    <tr>
        <td align="center">

            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;">

                <!-- Header -->
                <tr>
                    <td style="padding:32px 40px 20px 40px;">
                        <h1 style="margin:0;color:#7F1D1D;font-size:28px;font-weight:700;">
                            Prototype
                        </h1>

                        <div style="height:3px;width:64px;background:#7F1D1D;margin:16px 0 24px 0;"></div>

                        <h2 style="margin:0;font-size:24px;color:#111827;font-weight:600;">
                            Verify your email
                        </h2>
                    </td>
                </tr>

                <!-- Body -->
                <tr>
                    <td style="padding:0 40px;">

                        <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">
                            Hi {username if username else "there"},
                        </p>

                        <p style="margin:0 0 28px;font-size:15px;color:#4b5563;line-height:1.7;">
                            Use the verification code below to complete your registration.
                        </p>

                        <!-- Verification Code -->
                        <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:0 auto 28px;background:#FEF2F2;border:2px solid #7F1D1D;border-radius:8px;">
                            <tr>
                                <td style="padding:18px 42px;text-align:center;">
                                    <span style="font-size:38px;font-weight:700;color:#7F1D1D;font-family:'Courier New',monospace;letter-spacing:6px;">
                                        {verification_code}
                                    </span>
                                </td>
                            </tr>
                        </table>

                        <p style="margin:0 0 8px;text-align:center;font-size:14px;color:#6b7280;">
                            This code expires in <strong>10 minutes</strong>.
                        </p>

                        <p style="margin:0 0 36px;text-align:center;font-size:14px;color:#6b7280;line-height:1.6;">
                            If you didn't request this email, you can safely ignore it.
                        </p>

                    </td>
                </tr>

                <!-- Footer -->
                <tr>
                    <td style="padding:24px 40px;background:#fafafa;border-top:1px solid #e5e7eb;text-align:center;">
                        <p style="margin:0;font-size:13px;color:#9ca3af;">
                            Prototype • Emergency Notification System
                        </p>

                        <p style="margin:8px 0 0;font-size:12px;color:#9ca3af;">
                            &copy; 2026 Prototype. All rights reserved.
                        </p>
                    </td>
                </tr>

            </table>

        </td>
    </tr>
</table>

</body>
</html>
"""