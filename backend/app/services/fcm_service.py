from app.integrations.expo_push import send_expo_push


class NotificationService:

    @staticmethod
    def send_notification(payload):

        result = send_expo_push(
            token=payload.token,
            title=payload.title,
            body=payload.body,
            data=payload.data
        )

        # handle Expo errors safely
        if result.get("data", {}).get("status") == "error":
            return {
                "success": False,
                "error": result["data"]
            }

        return {
            "success": True,
            "response": result
        }