from app.core.supabase import client as supabase
from app.services.flood_alert_service import check_flood_alert


def process_flood_level(data: dict) -> dict:
    level = data.get("water_level_cm") or data.get("level_cm")
    sensor_id = data.get("sensor_id", "unknown")
    if level is None:
        return data

    if level > 150:
        status = "FLOOD_WARNING"
    elif level > 100:
        status = "WARNING"
    else:
        status = "SAFE"

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
