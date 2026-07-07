from app.integrations.expo_push import send_expo_push
from app.core.supabase import client
from app.services.sms import send_status_alert_sms


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

    @staticmethod
    def send_notificaiton_to_all_users(payload):
        tokens = client.table("notification").select("push_token").execute()
        tokens = tokens.data

        for item in tokens:
            send_expo_push(
                token=item["push_token"],
                title=payload.title,
                body=payload.body
            )

        return {"success": True}

    @staticmethod
    def send_alert_to_family(user_id):
        try:
            # Get user's family_id
            family_result = client.table("profiles").select("family_id").eq("id", user_id).execute()
            
            if not family_result.data or not family_result.data[0].get("family_id"):
                return []
            
            family_id = family_result.data[0]["family_id"]
            
            # Get all family members
            members_result = client.table("profiles").select("id").eq("family_id", family_id).execute()
            
            if not members_result.data:
                return []
            
            # Get all push tokens for family members
            member_ids = [member["id"] for member in members_result.data]
            print(f"members ID: {member_ids}")
            tokens_result = client.table("notification").select("push_token").in_("user_id", member_ids).neq("user_id",user_id).execute()
            
            if not tokens_result.data:
                return []
            
            # Extract push tokens
            tokens = [row["push_token"] for row in tokens_result.data if row.get("push_token")]
            print(f"members token: {tokens}")
            return tokens
            
        except Exception as e:
            print(f"Error in send_alert_to_family: {e}")
            return []

    @staticmethod
    async def send_alert_notification(payload):
        # Validate payload
        if not payload:
            return {"success": False, "message": "Payload is required"}

        if not getattr(payload, "user_id", None):
            return {"success": False, "message": "user_id is required"}

        if not getattr(payload, "status", None):
            return {"success": False, "message": "status is required"}

        if not getattr(payload, "body", None):
            return {"success": False, "message": "body is required"}

        title = getattr(payload, "title", None)
        if not title:
            status_label = str(payload.status).strip().replace("_", " ").title()
            title = f"{status_label} alert"

        notification_data = {
            "user_id": payload.user_id,
            "status": payload.status,
            "payload": payload.payload or {},
        }

        try:
            # Get contacts
            contacts_result = (
                client
                .table("contacts")
                .select("contact_id, contact_name, contact_number")
                .eq("user_id", payload.user_id)
                .execute()
            )

            contacts = getattr(contacts_result, "data", None) or []

            # Get family members - FIXED: call static method
            family_tokens = NotificationService.send_alert_to_family(payload.user_id)

            # If no contacts and no family members
            if not contacts and not family_tokens:
                return {
                    "success": False,
                    "message": "No contacts or family members found for this user"
                }

            sent_count = 0
            failed_count = 0
            all_tokens = []

            # Process contacts
            for contact in contacts:
                try:
                    contact_id = contact.get("contact_id")
                    if not contact_id:
                        failed_count += 1
                        continue

                    notification_result = (
                        client
                        .table("notification")
                        .select("push_token")
                        .eq("user_id", contact_id)
                        .execute()
                    )

                    notification_rows = getattr(notification_result, "data", None) or []
                    push_token = None

                    if notification_rows:
                        push_token = notification_rows[0].get("push_token")

                    if not push_token:
                        failed_count += 1
                        continue

                    all_tokens.append(push_token)

                except Exception as e:
                    print(f"Failed to get contact notification: {e}")
                    failed_count += 1

            # Add family tokens (avoid duplicates)
            for token in family_tokens:
                if token and token not in all_tokens:
                    all_tokens.append(token)

            # Send notifications to all tokens
            for push_token in all_tokens:
                try:
                    send_expo_push(
                        token=push_token,
                        title=title,
                        body=payload.body,
                        data=notification_data
                    )
                    sent_count += 1
                except Exception as e:
                    print(f"Failed to send notification: {e}")
                    failed_count += 1

            sms_result = None
            try:
                payload_data = payload.payload or {}

                full_name = None
                if isinstance(payload_data, dict):
                    full_name = payload_data.get("full_name") or payload_data.get("fullName")

                profile_result = (
                    client
                    .table("profiles")
                    .select("full_name, lat, lng")
                    .eq("id", payload.user_id)
                    .single()
                    .execute()
                )
                db_profile = profile_result.data or {}

                full_name = full_name or db_profile.get("full_name", "Someone")

                lat = None
                lng = None
                if isinstance(payload_data, dict):
                    lat = payload_data.get("lat") or payload_data.get("latitude")
                    lng = payload_data.get("lng") or payload_data.get("longitude")
                if lat is None or lng is None:
                    lat = db_profile.get("lat")
                    lng = db_profile.get("lng")

                sms_result = await send_status_alert_sms(
                    user_id=payload.user_id,
                    status=payload.status,
                    full_name=full_name,
                    lat=lat,
                    lng=lng,
                )
            except Exception as e:
                print(f"Failed to send SMS alert: {e}")

            return {
                "success": True,
                "sent_count": sent_count,
                "failed_count": failed_count,
                "contacts_found": len(contacts),
                "family_tokens_found": len(family_tokens),
                "sms_sent": bool(sms_result and sms_result.get("success")),
                "message": f"Expo push notifications processed: {sent_count} sent, {failed_count} failed"
            }

        except Exception as e:
            print(f"Database error: {e}")
            return {
                "success": False,
                "message": str(e)
            }