from fastapi import FastAPI

from app.api.index import router as api_router


app = FastAPI(title="Prototype API", version="0.1.0")

app.include_router(api_router)


@app.get("/")
async def root() -> dict[str, str]:
	return {"message": "Prototype API is running"}
