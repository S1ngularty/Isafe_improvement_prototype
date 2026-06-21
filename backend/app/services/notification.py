from app.integrations.expo_push import send_expo_push
from app.core.supabase import client


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

    def send_notificaiton_to_all_users(payload):
        tokens =  client.table("notification").select("push_token").execute()
        tokens= tokens.data

        for item in tokens:
            send_expo_push(
                token = item["push_token"],
                title = payload.title,
                body = payload.body
            )

        return {"success":True}
        