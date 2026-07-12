import os
from dotenv import load_dotenv

load_dotenv()


SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY_CHAT", os.getenv("GROQ_API_KEY", ""))

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")

APP_NAME = os.getenv("APP_NAME", "cityshield")
APP_VERSION = os.getenv("APP_VERSION", "1.0.0")
APP_CONTACT_EMAIL = os.getenv("APP_CONTACT_EMAIL", "contact@cityshield.app")

NOMINATIM_USER_AGENT = f"{APP_NAME}/{APP_VERSION} ({APP_CONTACT_EMAIL})"

WEATHER_CACHE_TTL = 600
GEOCACHE_TTL = 3600
NOMINATIM_RATE_LIMIT = 1.0

TIDECHECK_API_KEY = os.getenv("TIDECHECK_API_KEY", "")
TIDECHECK_API_URL = "https://tidecheck.com/api/station/fes2022-calauag/tides"
TIDECHECK_DEFAULT_PARAMS = {"days": "15", "datum": "LAT"}
TIDE_CACHE_TTL = 600
CRON_API_KEY = os.getenv("CRON_API_KEY", "")

TEXTBEE_API_KEY = os.getenv("TEXTBEE_API_KEY", "")
TEXTBEE_DEVICE_ID = os.getenv("TEXTBEE_DEVICE_ID", "")
TEXTBEE_API_BASE = "https://api.textbee.dev/api/v1/gateway/devices"

ULTRASONIC_CRITICAL_CM = 30
ULTRASONIC_SAFE_CM = 130
FLOOD_ALERT_COOLDOWN_MINUTES = 15
