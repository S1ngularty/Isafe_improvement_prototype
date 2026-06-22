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
    
    
    def send_alert_notification(payload):
        # Validate payload
        if not payload:
            return {"success": False, "message": "Payload is required"}

        if not getattr(payload, "user_id", None):
            return {"success": False, "message": "user_id is required"}

        if not getattr(payload, "title", None):
            return {"success": False, "message": "title is required"}

        if not getattr(payload, "body", None):
            return {"success": False, "message": "body is required"}

        try:
            result = (
                client
                .table("contacts")
                .select("*,notification!inner(push_token)")
                .eq("user_id", payload.user_id)
                .execute()
            )

            if not result.data:
                return {
                    "success": False,
                    "message": "No contacts found for this user"
                }

            sent_count = 0
            failed_count = 0

            for item in result.data:
                try:
                    notification = item.get("notification")

                    if not notification:
                        failed_count += 1
                        continue

                    push_token = notification.get("push_token")

                    if not push_token:
                        failed_count += 1
                        continue

                    send_expo_push(
                        token=push_token,
                        title=payload.title,
                        body=payload.body
                    )

                    sent_count += 1

                except Exception as e:
                    print(f"Failed to send notification: {e}")
                    failed_count += 1

            return {
                "success": True,
                "sent_count": sent_count,
                "failed_count": failed_count
            }

        except Exception as e:
            print(f"Database error: {e}")
            return {
                "success": False,
                "message": str(e)
            }


            