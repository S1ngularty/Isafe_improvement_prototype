# app/services/auth_service.py
from app.services.email_service import EmailService
from app.core.supabase import client
import bcrypt
import re
from datetime import datetime, timedelta, timezone
import secrets
import string
import uuid
from supabase import Client
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AuthService:
    
    # Class variable - shared across ALL instances
    _pending_users = {}  # email -> pending_user_data
    
    def __init__(self):
        self.email_service = EmailService()
        self.supabase: Client = client
        logger.info(f"AuthService initialized. Current pending users: {len(self._pending_users)}")
    
    def _get_current_time(self):
        """Get current UTC time with timezone"""
        return datetime.now(timezone.utc)
    
    async def register(self, payload):
        """Handle registration request"""
        email = payload.email.lower().strip()
        password = payload.password
        full_name = payload.full_name
        phone_number = payload.phone_number
        street_address = payload.street_address
        date_of_birth = payload.date_of_birth
        barangay_id = payload.barangay_id
        
        # Get barangay name from the barangays table
        barangay_name = None
        try:
            barangay_response = self.supabase.table("barangays").select("name").eq("id", barangay_id).execute()
            if barangay_response.data and len(barangay_response.data) > 0:
                barangay_name = barangay_response.data[0].get("name")
            else:
                barangay_name = f"Barangay {barangay_id}"
        except Exception as e:
            logger.error(f"Error fetching barangay name: {e}")
            barangay_name = f"Barangay {barangay_id}"
        
        logger.info(f"Processing registration for email: {email}, barangay: {barangay_name}")
        
        # Check if email already exists in Supabase auth
        try:
            users = self.supabase.auth.admin.list_users()
            existing_user = next((u for u in users if u.email == email), None)
            if existing_user:
                logger.warning(f"Email already registered: {email}")
                return {
                    "success": False, 
                    "message": "Email already registered. Please sign in instead."
                }
        except Exception as e:
            logger.error(f"Error checking existing user: {e}")
            return {
                "success": False,
                "message": "Unable to verify email. Please try again later."
            }
        
        # Check if email is pending verification
        if email in self._pending_users:
            pending = self._pending_users[email]
            expires_at = datetime.fromisoformat(pending["verification_code_expires"])
            if self._get_current_time() < expires_at:
                logger.info(f"Verification already sent to: {email}")
                return {
                    "success": False,
                    "message": "Verification already sent to this email. Please check your inbox or request a new code.",
                    "code_sent": True
                }
            else:
                logger.info(f"Removing expired pending registration for: {email}")
                del self._pending_users[email]
        
        try:
            # Generate verification code
            verification_code = ''.join(secrets.choice(string.digits) for _ in range(6))
            logger.info(f"Generated verification code for {email}: {verification_code}")
            
            # Create pending user data
            user_data = {
                "email": email,
                "password": password,
                "full_name": full_name,
                "phone_number": phone_number,
                "street_address": street_address,
                "date_of_birth": date_of_birth,
                "barangay_id": barangay_id,
                "barangay_name": barangay_name,
                "verification_code": verification_code,
                "verification_code_expires": (self._get_current_time() + timedelta(minutes=10)).isoformat(),
                "created_at": self._get_current_time().isoformat()
            }
            
            # Store pending user in CLASS variable
            AuthService._pending_users[email] = user_data
            logger.info(f"Stored pending user for {email}. Total pending: {len(AuthService._pending_users)}")
            
            # Send verification email
            body = self.email_service.generate_verification_email_body(full_name, verification_code)
            await self.email_service.send_email_verification(
                to=email,
                subject="Verify Your Email - Emergency Alert System",
                body=body
            )
            
            return {
                "success": True,
                "message": "Verification code sent to your email",
                "email": email,
                "requires_verification": True
            }
            
        except Exception as e:
            logger.error(f"Registration error for {email}: {e}")
            return {
                "success": False, 
                "message": "Unable to complete registration. Please try again later."
            }
    
    async def verify_email(self, email: str, verification_code: str):
        """Verify email and create Supabase user"""
        email = email.lower().strip()
        logger.info(f"Verifying email: {email} with code: {verification_code}")
        
        # Check if email has pending registration
        if email not in AuthService._pending_users:
            logger.warning(f"No pending registration found for email: {email}")
            return {
                "success": False, 
                "message": "No pending registration found. Please register first."
            }
        
        pending = AuthService._pending_users[email]
        logger.info(f"Found pending registration for {email}")
        
        # Check if verification code matches
        if pending["verification_code"] != verification_code:
            logger.warning(f"Invalid verification code for {email}")
            return {
                "success": False, 
                "message": "Invalid verification code. Please check and try again."
            }
        
        # Check if code expired
        expires_at = datetime.fromisoformat(pending["verification_code_expires"])
        if self._get_current_time() > expires_at:
            logger.warning(f"Verification code expired for {email}")
            del AuthService._pending_users[email]
            return {
                "success": False, 
                "message": "Verification code has expired. Please request a new one."
            }
        
        try:
            logger.info(f"Creating Supabase user for {email}")
            
            # Check if user already exists before creating
            try:
                users = self.supabase.auth.admin.list_users()
                existing_user = next((u for u in users if u.email == email), None)
                if existing_user:
                    logger.warning(f"User already exists: {email}")
                    # Clean up pending
                    if email in AuthService._pending_users:
                        del AuthService._pending_users[email]
                    return {
                        "success": False,
                        "message": "This email is already registered. Please sign in instead."
                    }
            except Exception as e:
                logger.error(f"Error checking existing user during verification: {e}")
            
            # Create user in Supabase auth
            auth_response = self.supabase.auth.admin.create_user({
                "email": email,
                "password": pending["password"],
                "email_confirm": True,
                "user_metadata": {
                    "full_name": pending["full_name"],
                    "barangay_id": pending["barangay_id"],
                    "barangay_name": pending.get("barangay_name", ""),
                    "phone_number": pending["phone_number"] or "",
                    "street_address": pending["street_address"] or "",
                    "date_of_birth": pending["date_of_birth"] or ""
                }
            })
            
            user_id = auth_response.user.id
            logger.info(f"Created user with ID: {user_id}")
            
            # Check if profile already exists before inserting
            try:
                # Try to get existing profile
                existing_profile = self.supabase.table("profiles").select("id").eq("id", user_id).execute()
                if existing_profile.data and len(existing_profile.data) > 0:
                    logger.info(f"Profile already exists for user: {user_id}, skipping profile creation")
                else:
                    # Create profile record
                    profile_data = {
                        "id": user_id,
                        "full_name": pending["full_name"],
                        "barangay_id": pending["barangay_id"],
                        "phone_number": pending["phone_number"],
                        "street_address": pending["street_address"],
                        "date_of_birth": pending["date_of_birth"],
                        "is_active": True,
                        "role": "user",
                        "status": "safe",
                        "location_sharing": False
                    }
                    
                    profile_response = self.supabase.table("profiles").insert(profile_data).execute()
                    logger.info(f"Created profile for user: {user_id}")
            except Exception as e:
                logger.warning(f"Profile creation issue (might already exist): {e}")
                # Continue even if profile creation fails - user is already created
            
            # Remove pending user
            if email in AuthService._pending_users:
                del AuthService._pending_users[email]
            logger.info(f"Removed pending registration for {email}")
            
            return {
                "success": True,
                "message": "Email verified and account created successfully! Please sign in.",
                "user_id": user_id
            }
            
        except Exception as e:
            error_message = str(e)
            logger.error(f"Error creating user for {email}: {error_message}")
            
            # Clean up pending registration if failed
            if email in AuthService._pending_users:
                del AuthService._pending_users[email]
            
            # Handle specific error cases
            if "duplicate key" in error_message.lower() or "already exists" in error_message.lower():
                return {
                    "success": False,
                    "message": "This email is already registered. Please sign in instead."
                }
            elif "password" in error_message.lower():
                return {
                    "success": False,
                    "message": "Invalid password format. Password must be at least 6 characters."
                }
            else:
                return {
                    "success": False,
                    "message": "Unable to create account. Please try again later."
                }
    
    async def resend_verification(self, email: str):
        """Resend verification code"""
        email = email.lower().strip()
        logger.info(f"Resending verification for: {email}")
        
        if email not in AuthService._pending_users:
            logger.warning(f"No pending registration found for: {email}")
            return {
                "success": False, 
                "message": "No pending registration found. Please register first."
            }
        
        pending = AuthService._pending_users[email]
        
        # Generate new verification code
        new_code = ''.join(secrets.choice(string.digits) for _ in range(6))
        pending["verification_code"] = new_code
        pending["verification_code_expires"] = (self._get_current_time() + timedelta(minutes=10)).isoformat()
        logger.info(f"Generated new code for {email}: {new_code}")
        
        try:
            # Send new verification email
            body = self.email_service.generate_verification_email_body(pending["full_name"], new_code)
            await self.email_service.send_email_verification(
                to=email,
                subject="New Verification Code - Emergency Alert System",
                body=body
            )
            
            return {
                "success": True,
                "message": "New verification code sent to your email"
            }
            
        except Exception as e:
            logger.error(f"Error resending verification for {email}: {e}")
            return {
                "success": False, 
                "message": "Unable to send verification code. Please try again later."
            }
    
    def get_pending_user(self, email: str):
        """Get pending user data (for debugging)"""
        email = email.lower().strip()
        return AuthService._pending_users.get(email)
    
    def cleanup_expired_pending(self):
        """Clean up expired pending registrations (call periodically)"""
        now = self._get_current_time()
        expired = []
        for email, data in AuthService._pending_users.items():
            expires_at = datetime.fromisoformat(data["verification_code_expires"])
            if now > expires_at:
                expired.append(email)
        for email in expired:
            logger.info(f"Cleaning up expired pending registration for: {email}")
            del AuthService._pending_users[email]