def process_flood_level(data:dict):
    level = data.get("level_cm")

    if level is None:
        return
    
    if level > 150:
        status = "FLOOD_WARNING"
    elif level > 100:
        status = "WARNING"
    else:
        status = "SAFE"

    data["status"] = status

    return