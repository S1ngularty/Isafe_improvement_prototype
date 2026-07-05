from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel, Field
from app.services.flood_hazard_service import read_summary, read_geojson, read_hazard_polygons, run_analysis
from app.services.groq import analyze_flood_hazard

router = APIRouter(prefix="/api/flood-hazard", tags=["flood-hazard"])

_last_run_status = {"status": "idle"}
_rerun_result = {"summary": None, "geojson": None, "polygons": None}


def _do_rerun():
    global _last_run_status, _rerun_result
    _last_run_status = {"status": "running"}
    run_result = run_analysis()
    if run_result.get("status") == "complete":
        _rerun_result = {
            "summary": read_summary(),
            "geojson": read_geojson(),
            "polygons": read_hazard_polygons(),
        }
    _last_run_status = run_result


@router.get("/summary")
async def get_summary():
    return read_summary()


@router.get("/geojson")
async def get_geojson():
    data = read_geojson()
    if data["features"]:
        return data
    return read_geojson()


@router.get("/polygons")
async def get_polygons():
    return read_hazard_polygons()


@router.get("/all")
async def get_all():
    return {
        "summary": read_summary(),
        "geojson": read_geojson(),
        "polygons": read_hazard_polygons(),
        "last_run_status": _last_run_status,
    }


@router.post("/rerun")
async def rerun_analysis(background_tasks: BackgroundTasks):
    global _last_run_status, _rerun_result
    if _last_run_status.get("status") == "running":
        return {"status": "already_running"}

    background_tasks.add_task(_do_rerun)
    return {"status": "started"}


@router.get("/rerun/status")
async def get_rerun_status():
    return _last_run_status


class AnalyzeFloodRequest(BaseModel):
    barangay: str = Field(..., min_length=1)
    data: dict
    language: str = Field(default="en", pattern=r"^(en|fil)$")


@router.post("/analyze", response_model=dict)
async def analyze_flood(body: AnalyzeFloodRequest):
    try:
        text = await analyze_flood_hazard(body.barangay, body.data, body.language)
        return {"data": text, "error": None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
