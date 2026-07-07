# app/routes/auth.py
from fastapi import APIRouter, HTTPException
from app.models.auth import RegisterModel, VerifyModel, ResendVerificationModel
from app.services.auth import AuthService

router = APIRouter(prefix="/api/auth", tags=["authentication"])

@router.post("/register")
async def account_register(payload: RegisterModel):
    auth_service = AuthService()
    result = await auth_service.register(payload)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result

@router.post("/verify")
async def verify_email(payload: VerifyModel):
    auth_service = AuthService()
    result = await auth_service.verify_email(payload.email, payload.verification_code)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result

@router.post("/resend-verification")
async def resend_verification(payload: ResendVerificationModel):
    auth_service = AuthService()
    result = await auth_service.resend_verification(payload.email)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message"))
    return result