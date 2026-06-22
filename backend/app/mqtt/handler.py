import json
from app.services.flood_level_service import process_flood_level

def handle_message(msg):
    try:
        data = json.loads(msg.payload.decode())
        process_flood_level(data)

    except Exception as e:
        print("MQTT parsing errror: ",e)

