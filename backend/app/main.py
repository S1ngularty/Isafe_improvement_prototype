from fastapi import FastAPI

from app.api.notification_api import router as notificaition_router

app =FastAPI()


app.include_router(
	notificaition_router,
	prefix="/notification",
	tags="notificaitons"
)


@app.get("/")
async def root() -> dict[str, str]:
	return {"message": "Prototype API is running"}
