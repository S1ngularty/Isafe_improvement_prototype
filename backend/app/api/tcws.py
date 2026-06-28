from fastapi import APIRouter, HTTPException
from app.models.tcws import TcwsCreate, TcwsUpdate
from app.services import tcws as service

router = APIRouter(prefix="/api/tcws", tags=["tcws"])


@router.get("/active", response_model=dict)
async def list_active():
    data = await service.get_active_alerts()
    return {"data": data, "error": None}


@router.get("/admin", response_model=dict)
async def list_all():
    data = await service.get_all_alerts()
    return {"data": data, "error": None}


@router.post("", response_model=dict)
async def create(body: TcwsCreate):
    try:
        data = await service.create_alert(
            signal_level=body.signal_level,
            description=body.description,
            wind_speed=body.wind_speed,
        )
        return {"data": data, "error": None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{alert_id}", response_model=dict)
async def update(alert_id: str, body: TcwsUpdate):
    try:
        data = await service.update_alert(
            alert_id=alert_id,
            signal_level=body.signal_level,
            description=body.description,
            wind_speed=body.wind_speed,
            is_active=body.is_active,
        )
        return {"data": data, "error": None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{alert_id}", response_model=dict)
async def delete(alert_id: str):
    try:
        await service.delete_alert(alert_id)
        return {"data": None, "error": None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
