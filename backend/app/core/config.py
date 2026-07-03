import os
from dotenv import load_dotenv

load_dotenv()


SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY_CHAT", os.getenv("GROQ_API_KEY", ""))

APP_NAME = os.getenv("APP_NAME", "cityshield")
APP_VERSION = os.getenv("APP_VERSION", "1.0.0")
APP_CONTACT_EMAIL = os.getenv("APP_CONTACT_EMAIL", "contact@cityshield.app")

NOMINATIM_USER_AGENT = f"{APP_NAME}/{APP_VERSION} ({APP_CONTACT_EMAIL})"

WEATHER_CACHE_TTL = 600
GEOCACHE_TTL = 3600
NOMINATIM_RATE_LIMIT = 1.0
