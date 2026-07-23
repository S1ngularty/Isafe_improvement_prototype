from fastapi import APIRouter, Response, status

router = APIRouter(prefix="/api")

@router.get("/health")
async def health_check():
    return {"status": "ok"}

@router.head("/health", status_code=status.HTTP_200_OK)
async def health_head():
    return Response(status_code=status.HTTP_200_OK)