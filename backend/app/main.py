from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import threading

from app.api.index import router as api_router
from app.api.weather import router as weather_router
from app.api.geocode import router as geocode_router
from app.api.routing import router as routing_router
from app.api.notification_api import router as notificaition_router
from app.api.evacuation import router as evacuation_router
from app.api.announcements import router as announcements_router
from app.api.flood_hazard import router as flood_hazard_router
from app.api.tcws import router as tcws_router
from app.api.chat import router as chat_router
from app.api.tide import router as tide_router
from app.api.family_alerts import router as family_alerts_router
from app.api.hotlines import router as hotlines_router
from app.api.admin_alerts import router as admin_alerts_router
from app.api.rescue import router as rescue_router
from app.api.admin_rescuers import router as admin_rescuers_router
from app.mqtt.client import start_mqtt

@asynccontextmanager
async def lifespan(app:FastAPI):
    mqtt_threading= threading.Thread(target=start_mqtt)
    mqtt_threading.daemon= True
    mqtt_threading.start()

    print("MQTT successfully started")

    yield

    print("MQTT shutdown")


app = FastAPI(title="CityShield API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)
app.include_router(weather_router)
app.include_router(geocode_router)
app.include_router(routing_router)
app.include_router(evacuation_router)
app.include_router(notificaition_router)
app.include_router(flood_hazard_router)
app.include_router(announcements_router)
app.include_router(tcws_router)
app.include_router(chat_router, prefix="/api/chat", tags=["chat"])
app.include_router(tide_router)
app.include_router(family_alerts_router)
app.include_router(hotlines_router)
app.include_router(admin_alerts_router)
app.include_router(rescue_router)
app.include_router(admin_rescuers_router)

@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "CityShield API is running"}
