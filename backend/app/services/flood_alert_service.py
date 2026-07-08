from datetime import datetime, timezone, timedelta

from app.core.config import (
    FLOOD_ALERT_THRESHOLD_CM,
    FLOOD_ALERT_BLINDSPOT_CM,
    FLOOD_ALERT_COOLDOWN_MINUTES,
)
from app.core.supabase import client
from app.services.sms import send_flood_alert_sms, send_flood_all_clear_sms
from app.integrations.expo_push import send_expo_push

BLINDSPOT_PLACEHOLDER_CM = 20


def _fetch_all_push_tokens() -> list[str]:
    try:
        result = client.table("notification").select("push_token").execute()
        tokens = []
        for row in result.data or []:
            token = row.get("push_token")
            if token and token not in tokens:
                tokens.append(token)
        return tokens
    except Exception as e:
        print(f"[flood_alert] Failed to fetch push tokens: {e}")
        return []


def _get_last_alert_entry(sensor_id: str) -> dict | None:
    try:
        result = (
            client.table("flood_alert_log")
            .select("alert_type, triggered_at")
            .eq("sensor_id", sensor_id)
            .order("triggered_at", desc=True)
            .limit(1)
            .execute()
        )
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"[flood_alert] Failed to query log: {e}")
        return None


def _log_alert_entry(
    sensor_id: str,
    water_level_cm: float | None,
    alert_type: str,
    recipients: int,
):
    try:
        client.table("flood_alert_log").insert({
            "sensor_id": sensor_id,
            "water_level_cm": water_level_cm,
            "alert_type": alert_type,
            "recipients": recipients,
        }).execute()
    except Exception as e:
        print(f"[flood_alert] Failed to log entry: {e}")


def check_flood_alert(water_level_cm: float | None, sensor_id: str):
    if not sensor_id:
        return

    if water_level_cm is None or water_level_cm <= 0:
        actual_reading = None
        effective_reading = 0
    else:
        actual_reading = water_level_cm
        effective_reading = water_level_cm

    if effective_reading <= FLOOD_ALERT_BLINDSPOT_CM:
        alert_state = "BLINDSPOT"
    elif effective_reading <= FLOOD_ALERT_THRESHOLD_CM:
        alert_state = "ALERT"
    else:
        alert_state = "SAFE"

    last_entry = _get_last_alert_entry(sensor_id)
    last_alert_type = last_entry.get("alert_type") if last_entry else None
    last_triggered_at = last_entry.get("triggered_at") if last_entry else None

    if alert_state in ("ALERT", "BLINDSPOT"):
        cooldown_active = False
        if last_alert_type in ("ALERT", "BLINDSPOT") and last_triggered_at:
            last_time = last_triggered_at
            if isinstance(last_time, str):
                last_time = datetime.fromisoformat(last_time.replace("Z", "+00:00"))
            elapsed = datetime.now(timezone.utc) - last_time
            if elapsed < timedelta(minutes=FLOOD_ALERT_COOLDOWN_MINUTES):
                cooldown_active = True

        if cooldown_active:
            return

        display_cm = actual_reading if actual_reading else BLINDSPOT_PLACEHOLDER_CM

        sms_result = send_flood_alert_sms(display_cm, sensor_id)
        recipients = 0
        if isinstance(sms_result, dict) and sms_result.get("success"):
            recipients = sms_result.get("recipients", 0)

        tokens = _fetch_all_push_tokens()
        push_body = (
            f"Water level has reached {display_cm:.0f}cm at sensor {sensor_id}. "
            f"Please take precautionary measures."
        )
        for token in tokens:
            try:
                send_expo_push(
                    token=token,
                    title="FLOOD ALERT",
                    body=push_body,
                )
            except Exception as e:
                print(f"[flood_alert] Push send failed: {e}")

        log_type = alert_state
        _log_alert_entry(sensor_id, actual_reading, log_type, recipients)

        print(
            f"[flood_alert] {log_type} sent for sensor {sensor_id}"
            f" (reading={display_cm}cm, sms_recipients={recipients},"
            f" push_tokens={len(tokens)})"
        )

    elif alert_state == "SAFE":
        if last_alert_type in ("ALERT", "BLINDSPOT"):
            display_cm = actual_reading if actual_reading else 0

            sms_result = send_flood_all_clear_sms(display_cm, sensor_id)
            recipients = 0
            if isinstance(sms_result, dict) and sms_result.get("success"):
                recipients = sms_result.get("recipients", 0)

            tokens = _fetch_all_push_tokens()
            push_body = (
                f"Water level at sensor {sensor_id} has receded to "
                f"{display_cm:.0f}cm. The immediate danger has passed."
            )
            for token in tokens:
                try:
                    send_expo_push(
                        token=token,
                        title="ALL CLEAR",
                        body=push_body,
                    )
                except Exception as e:
                    print(f"[flood_alert] Push send failed: {e}")

            _log_alert_entry(sensor_id, actual_reading, "ALL_CLEAR", recipients)

            print(
                f"[flood_alert] ALL_CLEAR sent for sensor {sensor_id}"
                f" (reading={display_cm}cm, sms_recipients={recipients},"
                f" push_tokens={len(tokens)})"
            )
