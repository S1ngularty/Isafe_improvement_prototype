from app.core.supabase import client as supabase
from app.services.flood_alert_service import check_flood_alert


def derive_status(water_level_cm: float) -> str:
    if water_level_cm < 50:
        return "FLOOD_WARNING"
    if water_level_cm <= 70:
        return "WARNING"
    return "SAFE"


def process_flood_level(data: dict) -> dict:
    level = data.get("water_level_cm") or data.get("level_cm")
    sensor_id = data.get("sensor_id", "unknown")
    if level is None:
        return data

    status = derive_status(level)

    if supabase is not None:
        try:
            record = {
                "sensor_id": sensor_id,
                "distance_mm": data.get("distance_mm"),
                "water_level_cm": level,
                "status": status,
                "samples": data.get("samples"),
            }
            supabase.table("water_level_readings").insert(record).execute()
        except Exception as e:
            print("Failed to insert water level reading:", e)

    data["status"] = status

    try:
        check_flood_alert(level, sensor_id)
    except Exception as e:
        print("Failed to check flood alert:", e)

    return data
