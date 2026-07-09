from pydantic import BaseModel, Field


class SendPhoneOtpRequest(BaseModel):
    phone_number: str = Field(
        ...,
        pattern=r"^\+63\d{10}$",
        description="PH mobile number in +63XXXXXXXXXX format",
    )


class VerifyPhoneOtpRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=6, description="6-digit OTP code")


class PhoneResponse(BaseModel):
    success: bool
    message: str
