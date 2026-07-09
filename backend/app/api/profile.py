from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_user
from app.models.profile import (
    SendPhoneOtpRequest,
    VerifyPhoneOtpRequest,
    PhoneResponse,
)
from app.services.phone_verification import PhoneVerificationService
from app.core.supabase import client

router = APIRouter(prefix="/api/profile", tags=["profile"])


@router.post("/send-phone-otp", response_model=PhoneResponse)
async def send_phone_otp(
    payload: SendPhoneOtpRequest,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]
    result = await PhoneVerificationService.send_otp(user_id, payload.phone_number)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return PhoneResponse(**result)


@router.post("/verify-phone", response_model=PhoneResponse)
async def verify_phone(
    payload: VerifyPhoneOtpRequest,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]
    result = await PhoneVerificationService.verify_otp(user_id, payload.code)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return PhoneResponse(**result)


@router.delete("/phone", response_model=PhoneResponse)
async def remove_phone(
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]
    try:
        result = (
            client.table("profiles")
            .update({"phone_number": None, "phone_verified": False})
            .eq("id", user_id)
            .execute()
        )
        if not result.data:
            raise HTTPException(status_code=404, detail="Profile not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    PhoneVerificationService.clear_pending(user_id)
    return PhoneResponse(success=True, message="Phone number removed")
