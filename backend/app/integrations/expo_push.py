import requests

EXPO_URL = "https://exp.host/--/api/v2/push/send"

def send_expo_push(token: str, title: str, body: str, data: dict = None):
    payload = {
        "to": token,
        "sound": "default",
        "title": title,
        "body": body,
        "data": data or {},
    }

    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
    }

    response = requests.post(EXPO_URL, json=payload, headers=headers)
    return response.json()