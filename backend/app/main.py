from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.index import router as api_router
from app.api.weather import router as weather_router
from app.api.geocode import router as geocode_router
from app.api.routing import router as routing_router
from app.api.notification_api import router as notification_router

app = FastAPI(title="CityShield API", version="0.1.0")

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
app.include_router(notification_router, prefix="/notification", tags=["notifications"])


@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "CityShield API is running"}
