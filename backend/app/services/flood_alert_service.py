from datetime import datetime, timezone, timedelta

from app.core.config import (
    FLOOD_ALERT_THRESHOLD_CM,
    FLOOD_ALERT_BLINDSPOT_CM,
    FLOOD_ALERT_COOLDOWN_MINUTES,
)
from app.core.supabase import client
from app.services.sms import (
    send_flood_alert_sms,
    send_flood_all_clear_sms,
    send_float_switch_2m_alert_sms,
    send_float_switch_2m_all_clear_sms,
)
from app.integrations.expo_push import send_expo_push

BLINDSPOT_PLACEHOLDER_CM = 50
FLOAT_SWITCH_2M_COOLDOWN_MINUTES = 30


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

    if effective_reading < FLOOD_ALERT_BLINDSPOT_CM:
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
            f"Water level has reached {display_cm / 100:.2f}m at sensor {sensor_id}. "
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
            f" (reading={display_cm / 100:.2f}m, sms_recipients={recipients},"
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
                f"{display_cm / 100:.2f}m. The immediate danger has passed."
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
                f" (reading={display_cm / 100:.2f}m, sms_recipients={recipients},"
                f" push_tokens={len(tokens)})"
            )


def check_float_switch_2m(sensor_id: str, current_state: bool):
    if not sensor_id:
        return

    try:
        result = (
            client.table("water_level_readings")
            .select("float_switch_2m")
            .eq("sensor_id", sensor_id)
            .order("recorded_at", desc=True)
            .limit(2)
            .execute()
        )
        rows = result.data if result.data else []
    except Exception as e:
        print(f"[float_switch_2m] Failed to query previous state: {e}")
        return

    prev_state = None
    if len(rows) >= 2:
        prev_state = rows[1].get("float_switch_2m")

    if current_state and prev_state is not True:
        last_entry = _get_last_alert_entry_for_type(sensor_id, "FLOAT_SWITCH_2M")
        if last_entry and last_entry.get("triggered_at"):
            last_time = last_entry["triggered_at"]
            if isinstance(last_time, str):
                last_time = datetime.fromisoformat(last_time.replace("Z", "+00:00"))
            elapsed = datetime.now(timezone.utc) - last_time
            if elapsed < timedelta(minutes=FLOAT_SWITCH_2M_COOLDOWN_MINUTES):
                print(f"[float_switch_2m] Cooldown active for sensor {sensor_id}")
                return

        sms_result = send_float_switch_2m_alert_sms(sensor_id)
        recipients = 0
        if isinstance(sms_result, dict) and sms_result.get("success"):
            recipients = sms_result.get("recipients", 0)

        tokens = _fetch_all_push_tokens()
        push_body = (
            f"Water level has reached 2 meters at sensor {sensor_id}."
            f" Please take precautionary measures and prepare for possible evacuation."
        )
        for token in tokens:
            try:
                send_expo_push(
                    token=token,
                    title="FLOOD ALERT",
                    body=push_body,
                )
            except Exception as e:
                print(f"[float_switch_2m] Push send failed: {e}")

        _log_alert_entry(sensor_id, None, "FLOAT_SWITCH_2M", recipients)
        print(
            f"[float_switch_2m] TRIGGER sent for sensor {sensor_id}"
            f" (sms_recipients={recipients}, push_tokens={len(tokens)})"
        )

    elif not current_state and prev_state is True:
        last_entry = _get_last_alert_entry_for_type(sensor_id, "FLOAT_SWITCH_2M")
        if not last_entry:
            return

        sms_result = send_float_switch_2m_all_clear_sms(sensor_id)
        recipients = 0
        if isinstance(sms_result, dict) and sms_result.get("success"):
            recipients = sms_result.get("recipients", 0)

        tokens = _fetch_all_push_tokens()
        push_body = (
            f"Water level at sensor {sensor_id} has dropped below 2 meters."
            f" The immediate danger has passed."
        )
        for token in tokens:
            try:
                send_expo_push(
                    token=token,
                    title="ALL CLEAR",
                    body=push_body,
                )
            except Exception as e:
                print(f"[float_switch_2m] Push send failed: {e}")

        _log_alert_entry(sensor_id, None, "FLOAT_SWITCH_2M_ALL_CLEAR", recipients)
        print(
            f"[float_switch_2m] ALL_CLEAR sent for sensor {sensor_id}"
            f" (sms_recipients={recipients}, push_tokens={len(tokens)})"
        )


def _get_last_alert_entry_for_type(sensor_id: str, alert_type: str) -> dict | None:
    try:
        result = (
            client.table("flood_alert_log")
            .select("alert_type, triggered_at")
            .eq("sensor_id", sensor_id)
            .eq("alert_type", alert_type)
            .order("triggered_at", desc=True)
            .limit(1)
            .execute()
        )
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"[flood_alert] Failed to query log for type {alert_type}: {e}")
        return None
