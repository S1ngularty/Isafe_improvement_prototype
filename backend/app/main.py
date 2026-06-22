from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import threading

from app.api.weather import router as weather_router
from app.api.geocode import router as geocode_router
from app.api.notification_api import router as notificaition_router
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

app.include_router(weather_router)
app.include_router(geocode_router)
app.include_router(notificaition_router)

@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "CityShield API is running"}
