# app/models/auth.py
from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class RegisterModel(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str
    phone_number: Optional[str] = None
    street_address: Optional[str] = None
    date_of_birth: Optional[str] = None
    barangay_id: int
    
class VerifyModel(BaseModel):
    email: EmailStr
    verification_code: str
    
class ResendVerificationModel(BaseModel):
    email: EmailStr