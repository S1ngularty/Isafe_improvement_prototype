from datetime import datetime, timezone, timedelta

from app.core.config import (
    ULTRASONIC_CRITICAL_CM,
    ULTRASONIC_SAFE_CM,
    FLOOD_ALERT_COOLDOWN_MINUTES,
)
from app.core.supabase import client
from app.services.sms import (
    send_critical_alert_sms,
    send_green_alert_sms,
    send_float_switch_2m_alert_sms,
    send_float_switch_2m_all_clear_sms,
    send_float_switch_1m_alert_sms,
    send_float_switch_1m_all_clear_sms,
)
from app.integrations.expo_push import send_expo_push




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


def _get_last_ultrasonic_alert(sensor_id: str) -> dict | None:
    try:
        result = (
            client.table("flood_alert_log")
            .select("alert_type, triggered_at")
            .eq("sensor_id", sensor_id)
            .in_("alert_type", ["CRITICAL_ALERT", "ALL_CLEAR"])
            .order("triggered_at", desc=True)
            .limit(1)
            .execute()
        )
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"[flood_alert] Failed to query ultrasonic log: {e}")
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

    if water_level_cm is None or water_level_cm < 0:
        return

    if water_level_cm < ULTRASONIC_CRITICAL_CM:
        state = "CRITICAL"
    elif water_level_cm > ULTRASONIC_SAFE_CM:
        state = "GREEN"
    else:
        return

    if state == "CRITICAL":
        last_entry = _get_last_alert_entry_for_type(sensor_id, "CRITICAL_ALERT")
        if last_entry and last_entry.get("triggered_at"):
            last_time = last_entry["triggered_at"]
            if isinstance(last_time, str):
                last_time = datetime.fromisoformat(last_time.replace("Z", "+00:00"))
            elapsed = datetime.now(timezone.utc) - last_time
            if elapsed < timedelta(minutes=FLOOD_ALERT_COOLDOWN_MINUTES):
                print(f"[flood_alert] CRITICAL cooldown active for sensor {sensor_id}")
                return

        sms_result = send_critical_alert_sms(sensor_id)
        recipients = 0
        if isinstance(sms_result, dict) and sms_result.get("success"):
            recipients = sms_result.get("recipients", 0)

        tokens = _fetch_all_push_tokens()
        push_body = (
            "CRITICAL ALERT: Water level is above 2 meters."
            " Evacuate immediately and follow instructions"
            " from local authorities."
        )
        for token in tokens:
            try:
                send_expo_push(
                    token=token,
                    title="CRITICAL ALERT",
                    body=push_body,
                )
            except Exception as e:
                print(f"[flood_alert] Push send failed: {e}")

        _log_alert_entry(sensor_id, water_level_cm, "CRITICAL_ALERT", recipients)
        print(
            f"[flood_alert] CRITICAL_ALERT sent for sensor {sensor_id}"
            f" (sms_recipients={recipients}, push_tokens={len(tokens)})"
        )

    elif state == "GREEN":
        last_ultrasonic = _get_last_ultrasonic_alert(sensor_id)
        if last_ultrasonic is None:
            return

        if last_ultrasonic.get("alert_type") == "ALL_CLEAR":
            return

        sms_result = send_green_alert_sms(sensor_id)
        recipients = 0
        if isinstance(sms_result, dict) and sms_result.get("success"):
            recipients = sms_result.get("recipients", 0)

        tokens = _fetch_all_push_tokens()
        push_body = (
            "Water level is below 1 meter."
            " Conditions are normal."
            " Continue to monitor updates."
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

        _log_alert_entry(sensor_id, water_level_cm, "ALL_CLEAR", recipients)
        print(
            f"[flood_alert] ALL_CLEAR sent for sensor {sensor_id}"
            f" (sms_recipients={recipients}, push_tokens={len(tokens)})"
        )


def _parse_dt(val):
    if isinstance(val, str):
        return datetime.fromisoformat(val.replace("Z", "+00:00"))
    return val


def _is_new_rising_edge(sensor_id: str, alert_type: str, all_clear_type: str) -> bool:
    last_alert = _get_last_alert_entry_for_type(sensor_id, alert_type)
    if not last_alert:
        return True

    last_all_clear = _get_last_alert_entry_for_type(sensor_id, all_clear_type)
    if not last_all_clear:
        return False

    return _parse_dt(last_all_clear["triggered_at"]) > _parse_dt(last_alert["triggered_at"])


def _has_active_alert(sensor_id: str, alert_type: str, all_clear_type: str) -> bool:
    last_alert = _get_last_alert_entry_for_type(sensor_id, alert_type)
    if not last_alert:
        return False

    last_all_clear = _get_last_alert_entry_for_type(sensor_id, all_clear_type)
    if not last_all_clear:
        return True

    return _parse_dt(last_alert["triggered_at"]) > _parse_dt(last_all_clear["triggered_at"])


def check_float_switch_2m(sensor_id: str, current_state: bool):
    if not sensor_id:
        return

    if current_state:
        if not _is_new_rising_edge(sensor_id, "FLOAT_SWITCH_2M", "FLOAT_SWITCH_2M_ALL_CLEAR"):
            print(f"[float_switch_2m] Already alerted, skipping (sensor={sensor_id})")
            return

        print(f"[float_switch_2m] Sending RED alert (sensor={sensor_id}, current_state={current_state})")
        sms_result = send_float_switch_2m_alert_sms(sensor_id)
        recipients = 0
        if isinstance(sms_result, dict) and sms_result.get("success"):
            recipients = sms_result.get("recipients", 0)

        tokens = _fetch_all_push_tokens()
        push_body = (
            "RED ALERT: Water level is now at 2 meters."
            " Please stay alert and prepare to evacuate"
            " if advised by local authorities."
        )
        for token in tokens:
            try:
                send_expo_push(
                    token=token,
                    title="RED ALERT",
                    body=push_body,
                )
            except Exception as e:
                print(f"[float_switch_2m] Push send failed: {e}")

        _log_alert_entry(sensor_id, None, "FLOAT_SWITCH_2M", recipients)
        print(
            f"[float_switch_2m] RED alert sent for sensor {sensor_id}"
            f" (sms_recipients={recipients}, push_tokens={len(tokens)})"
        )

    else:
        if not _has_active_alert(sensor_id, "FLOAT_SWITCH_2M", "FLOAT_SWITCH_2M_ALL_CLEAR"):
            print(f"[float_switch_2m] No active alert to clear, skipping (sensor={sensor_id})")
            return

        print(f"[float_switch_2m] Sending RED all-clear (sensor={sensor_id}, current_state={current_state})")
        sms_result = send_float_switch_2m_all_clear_sms(sensor_id)
        recipients = 0
        if isinstance(sms_result, dict) and sms_result.get("success"):
            recipients = sms_result.get("recipients", 0)

        tokens = _fetch_all_push_tokens()
        push_body = (
            f"Water level at sensor {sensor_id} has dropped below 2 meters."
            f" The RED alert has been lifted."
        )
        for token in tokens:
            try:
                send_expo_push(
                    token=token,
                    title="ALERT LIFTED",
                    body=push_body,
                )
            except Exception as e:
                print(f"[float_switch_2m] Push send failed: {e}")

        _log_alert_entry(sensor_id, None, "FLOAT_SWITCH_2M_ALL_CLEAR", recipients)
        print(
            f"[float_switch_2m] RED all-clear sent for sensor {sensor_id}"
            f" (sms_recipients={recipients}, push_tokens={len(tokens)})"
        )


def check_float_switch_1m(sensor_id: str, current_state: bool):
    if not sensor_id:
        return

    if current_state:
        if not _is_new_rising_edge(sensor_id, "FLOAT_SWITCH_1M", "FLOAT_SWITCH_1M_ALL_CLEAR"):
            print(f"[float_switch_1m] Already alerted, skipping (sensor={sensor_id})")
            return

        print(f"[float_switch_1m] Sending YELLOW alert (sensor={sensor_id}, current_state={current_state})")
        sms_result = send_float_switch_1m_alert_sms(sensor_id)
        recipients = 0
        if isinstance(sms_result, dict) and sms_result.get("success"):
            recipients = sms_result.get("recipients", 0)

        tokens = _fetch_all_push_tokens()
        push_body = (
            "YELLOW ALERT: Water level is now at 1 meter."
            " Please stay alert and monitor updates."
        )
        for token in tokens:
            try:
                send_expo_push(
                    token=token,
                    title="YELLOW ALERT",
                    body=push_body,
                )
            except Exception as e:
                print(f"[float_switch_1m] Push send failed: {e}")

        _log_alert_entry(sensor_id, None, "FLOAT_SWITCH_1M", recipients)
        print(
            f"[float_switch_1m] YELLOW alert sent for sensor {sensor_id}"
            f" (sms_recipients={recipients}, push_tokens={len(tokens)})"
        )

    else:
        if not _has_active_alert(sensor_id, "FLOAT_SWITCH_1M", "FLOAT_SWITCH_1M_ALL_CLEAR"):
            print(f"[float_switch_1m] No active alert to clear, skipping (sensor={sensor_id})")
            return

        print(f"[float_switch_1m] Sending YELLOW all-clear (sensor={sensor_id}, current_state={current_state})")
        sms_result = send_float_switch_1m_all_clear_sms(sensor_id)
        recipients = 0
        if isinstance(sms_result, dict) and sms_result.get("success"):
            recipients = sms_result.get("recipients", 0)

        tokens = _fetch_all_push_tokens()
        push_body = (
            f"Water level at sensor {sensor_id} has dropped below 1 meter."
            f" The YELLOW alert has been lifted."
        )
        for token in tokens:
            try:
                send_expo_push(
                    token=token,
                    title="ALERT LIFTED",
                    body=push_body,
                )
            except Exception as e:
                print(f"[float_switch_1m] Push send failed: {e}")

        _log_alert_entry(sensor_id, None, "FLOAT_SWITCH_1M_ALL_CLEAR", recipients)
        print(
            f"[float_switch_1m] YELLOW all-clear sent for sensor {sensor_id}"
            f" (sms_recipients={recipients}, push_tokens={len(tokens)})"
        )
