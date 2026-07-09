import secrets
import string
from datetime import datetime, timedelta, timezone

from app.core.supabase import client
from app.services.sms import send_otp_sms
from app.services.sms import _format_phone


class PhoneVerificationService:
    _pending_otps: dict[str, dict] = {}
    _last_request: dict[str, datetime] = {}

    MINIMUM_INTERVAL_SECONDS = 60
    OTP_EXPIRY_MINUTES = 10

    @classmethod
    def _get_current_time(cls) -> datetime:
        return datetime.now(timezone.utc)

    @classmethod
    async def send_otp(cls, user_id: str, phone_number: str) -> dict:
        formatted = _format_phone(phone_number)
        if not formatted:
            return {"success": False, "message": "Invalid phone number format"}

        now = cls._get_current_time()

        last = cls._last_request.get(user_id)
        if last and (now - last).total_seconds() < cls.MINIMUM_INTERVAL_SECONDS:
            remaining = int(cls.MINIMUM_INTERVAL_SECONDS - (now - last).total_seconds())
            return {
                "success": False,
                "message": f"Please wait {remaining} seconds before requesting a new code",
            }

        if user_id in cls._pending_otps:
            cls._pending_otps.pop(user_id, None)

        code = "".join(secrets.choice(string.digits) for _ in range(6))

        cls._pending_otps[user_id] = {
            "code": code,
            "phone": formatted,
            "expires_at": (now + timedelta(minutes=cls.OTP_EXPIRY_MINUTES)).isoformat(),
        }
        cls._last_request[user_id] = now

        sms_result = send_otp_sms(formatted, code)
        if sms_result is None:
            cls._pending_otps.pop(user_id, None)
            return {"success": False, "message": "Failed to send SMS. Please try again later."}

        return {"success": True, "message": "Verification code sent to your phone"}

    @classmethod
    async def verify_otp(cls, user_id: str, code: str) -> dict:
        pending = cls._pending_otps.get(user_id)
        if not pending:
            return {"success": False, "message": "No verification code was sent. Please request one first."}

        now = cls._get_current_time()
        expires_at = datetime.fromisoformat(pending["expires_at"])
        if now > expires_at:
            cls._pending_otps.pop(user_id, None)
            return {"success": False, "message": "Verification code has expired. Please request a new one."}

        if pending["code"] != code:
            return {"success": False, "message": "Invalid verification code. Please check and try again."}

        try:
            result = (
                client.table("profiles")
                .update({"phone_verified": True})
                .eq("id", user_id)
                .execute()
            )
            if not result.data:
                return {"success": False, "message": "Failed to update profile. Please try again."}
        except Exception as e:
            return {"success": False, "message": f"Database error: {str(e)}"}

        cls._pending_otps.pop(user_id, None)
        return {"success": True, "message": "Phone number verified successfully"}

    @classmethod
    def clear_pending(cls, user_id: str) -> None:
        cls._pending_otps.pop(user_id, None)
        cls._last_request.pop(user_id, None)
