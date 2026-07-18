from app.core.supabase import client as supabase
from app.services.flood_alert_service import (
    check_flood_alert,
    check_float_switch_2m,
    check_float_switch_1m,
)


def derive_status(water_level_cm: float) -> str:
    if water_level_cm < 30:
        return "CRITICAL"
    if water_level_cm <= 130:
        return "WARNING"
    return "SAFE"


def process_flood_level(data: dict) -> dict:
    level = data.get("water_level_cm")
    if level is None:
        level = data.get("level_cm")
    sensor_id = data.get("sensor_id", "unknown")

    float_switch_1m = data.get("float_switch_1m")
    float_switch_2m = data.get("float_switch_2m")

    if supabase is not None:
        try:
            record = {
                "sensor_id": sensor_id,
                "distance_mm": data.get("distance_mm"),
                "water_level_cm": level if level is not None else 0,
                "status": derive_status(level) if level is not None else "SAFE",
                "samples": data.get("samples"),
            }
            if float_switch_1m is not None:
                record["float_switch_1m"] = float_switch_1m
            if float_switch_2m is not None:
                record["float_switch_2m"] = float_switch_2m

            supabase.table("water_level_readings").insert(record).execute()
        except Exception as e:
            print("Failed to insert water level reading:", e)

    if level is not None:
        data["status"] = derive_status(level)

        try:
            check_flood_alert(level, sensor_id)
        except Exception as e:
            print("Failed to check flood alert:", e)

    if float_switch_2m is not None:
        try:
            check_float_switch_2m(sensor_id, float_switch_2m)
        except Exception as e:
            print("Failed to check float switch 2m alert:", e)

    if float_switch_1m is not None:
        try:
            check_float_switch_1m(sensor_id, float_switch_1m)
        except Exception as e:
            print("Failed to check float switch 1m alert:", e)

    return data
