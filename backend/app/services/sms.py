import httpx
import re
from app.core.config import TEXTBEE_API_KEY, TEXTBEE_DEVICE_ID, TEXTBEE_API_BASE
from app.core.supabase import client

SMS_MESSAGE_TEMPLATE = (
    "ALERT: {full_name} triggered a {status} alert"
    " at {location}."
    " Please check on them immediately."
    " - CityShield"
)

CRITICAL_ALERT_SMS_TEMPLATE = (
    "CRITICAL ALERT: Water level is above 2 meters."
    " Evacuate immediately and follow instructions"
    " from local authorities."
    " - CityShield"
)

RED_ALERT_SMS_TEMPLATE = (
    "RED ALERT: Water level is now at 2 meters."
    " Please stay alert and prepare to evacuate"
    " if advised by local authorities."
    " - CityShield"
)

YELLOW_ALERT_SMS_TEMPLATE = (
    "YELLOW ALERT: Water level is now at 1 meter."
    " Please stay alert and monitor updates."
    " - CityShield"
)

GREEN_ALERT_SMS_TEMPLATE = (
    "Water level is below 1 meter."
    " Conditions are normal."
    " Continue to monitor updates."
    " - CityShield"
)

FLOAT_SWITCH_2M_ALL_CLEAR_SMS_TEMPLATE = (
    "RED ALERT ALL CLEAR: Water level at sensor {sensor_id}"
    " has dropped below 2 meters."
    " The immediate danger has passed."
    " - CityShield"
)

FLOAT_SWITCH_1M_ALERT_SMS_TEMPLATE = YELLOW_ALERT_SMS_TEMPLATE

FLOAT_SWITCH_1M_ALL_CLEAR_SMS_TEMPLATE = (
    "YELLOW ALERT ALL CLEAR: Water level at sensor {sensor_id}"
    " has dropped below 1 meter."
    " - CityShield"
)

OTP_SMS_TEMPLATE = (
    "Your CityShield verification code is: {code}. "
    "This code is valid for 10 minutes. Do not share this code."
    " - CityShield"
)


def send_otp_sms(phone: str, code: str) -> dict | None:
    formatted = _format_phone(phone)
    if not formatted:
        print(f"[sms] Invalid phone number for OTP: {phone}")
        return None

    message = OTP_SMS_TEMPLATE.format(code=code)
    return _send_textbee_sms([formatted], message)


def _format_phone(number: str) -> str | None:
    digits = re.sub(r"\D", "", number)
    if not digits:
        return None
    if digits.startswith("63") and len(digits) >= 11:
        return f"+{digits}"
    if digits.startswith("0"):
        return f"+63{digits[1:]}"
    return f"+63{digits}"


def _build_location(lat: float | None, lng: float | None) -> str:
    if lat is not None and lng is not None:
        return f"({lat}, {lng})"
    return "an unknown location"


async def _fetch_phone_numbers(user_id: str) -> list[str]:
    numbers: list[str] = []
    raw_debug: list[dict] = []

    contacts_result = (
        client.table("contacts")
        .select("contact_number")
        .eq("user_id", user_id)
        .execute()
    )
    print(f"[sms] Raw contacts data for {user_id}: {contacts_result.data}")
    for row in contacts_result.data or []:
        number = row.get("contact_number")
        raw_debug.append({"source": "contacts", "raw": number})
        if number:
            formatted = _format_phone(number)
            print(f"[sms] contacts number raw='{number}' -> formatted='{formatted}'")
            if formatted:
                numbers.append(formatted)
            else:
                print(f"[sms] contacts number '{number}' failed formatting (result was None)")

    family_result = (
        client.table("profiles")
        .select("family_id")
        .eq("id", user_id)
        .single()
        .execute()
    )
    print(f"[sms] Family lookup for {user_id}: {family_result.data}")
    family_id = (family_result.data or {}).get("family_id")
    if family_id:
        members_result = (
            client.table("profiles")
            .select("phone_number")
            .eq("family_id", family_id)
            .neq("id", user_id)
            .execute()
        )
        print(f"[sms] Family members phone_number data: {members_result.data}")
        for row in members_result.data or []:
            phone = row.get("phone_number")
            raw_debug.append({"source": "family", "raw": phone})
            if phone:
                formatted = _format_phone(phone)
                print(f"[sms] family phone raw='{phone}' -> formatted='{formatted}'")
                if formatted and formatted not in numbers:
                    numbers.append(formatted)
                elif not formatted:
                    print(f"[sms] family phone '{phone}' failed formatting (result was None)")
    else:
        print(f"[sms] User {user_id} has no family_id")

    print(f"[sms] Final recipients list for {user_id}: {numbers}")
    return numbers


def _send_textbee_sms(recipients: list[str], message: str) -> dict | None:
    if not TEXTBEE_API_KEY or not TEXTBEE_DEVICE_ID:
        print("[sms] TEXTBEE_API_KEY or TEXTBEE_DEVICE_ID not configured — skipping SMS")
        return None

    url = f"{TEXTBEE_API_BASE}/{TEXTBEE_DEVICE_ID}/send-sms"
    payload = {"recipients": recipients, "message": message}

    print(f"[sms] POST {url}")
    print(f"[sms] Sending to {len(recipients)} recipient(s)")

    try:
        with httpx.Client(timeout=15.0) as http:
            resp = http.post(
                url,
                json=payload,
                headers={"Content-Type": "application/json", "x-api-key": TEXTBEE_API_KEY},
            )
            print(f"[sms] Response status: {resp.status_code}")
            print(f"[sms] Response body: {resp.text}")

            if resp.status_code == 422:
                print(f"[sms] Validation error details: {resp.json()}")
            resp.raise_for_status()
            return resp.json()
    except Exception as e:
        print(f"[sms] Failed to send SMS: {e}")
        return None


def send_critical_alert_sms(sensor_id: str) -> dict:
    if not TEXTBEE_API_KEY or not TEXTBEE_DEVICE_ID:
        print("[sms] TEXTBEE_API_KEY or TEXTBEE_DEVICE_ID not configured — skipping SMS")
        return {"success": False, "message": "textbee not configured"}

    try:
        result = client.table("profiles").select("phone_number").execute()
        raw_numbers = []
        for row in result.data or []:
            phone = row.get("phone_number")
            if phone:
                formatted = _format_phone(phone)
                if formatted and formatted not in raw_numbers:
                    raw_numbers.append(formatted)

        if not raw_numbers:
            print("[sms] No phone numbers found in profiles")
            return {"success": False, "message": "no phone numbers"}

        message = CRITICAL_ALERT_SMS_TEMPLATE

        resp_data = _send_textbee_sms(raw_numbers, message)
        if resp_data is None:
            return {"success": False, "message": "sms send failed"}

        print(f"[sms] Sent critical alert to {len(raw_numbers)} recipient(s)")
        return {"success": True, "recipients": len(raw_numbers), "response": resp_data}

    except Exception as e:
        print(f"[sms] Failed to send critical alert SMS: {e}")
        return {"success": False, "error": str(e)}


def send_green_alert_sms(sensor_id: str) -> dict:
    if not TEXTBEE_API_KEY or not TEXTBEE_DEVICE_ID:
        print("[sms] TEXTBEE_API_KEY or TEXTBEE_DEVICE_ID not configured — skipping SMS")
        return {"success": False, "message": "textbee not configured"}

    try:
        result = client.table("profiles").select("phone_number").execute()
        raw_numbers = []
        for row in result.data or []:
            phone = row.get("phone_number")
            if phone:
                formatted = _format_phone(phone)
                if formatted and formatted not in raw_numbers:
                    raw_numbers.append(formatted)

        if not raw_numbers:
            print("[sms] No phone numbers found in profiles")
            return {"success": False, "message": "no phone numbers"}

        message = GREEN_ALERT_SMS_TEMPLATE

        resp_data = _send_textbee_sms(raw_numbers, message)
        if resp_data is None:
            return {"success": False, "message": "sms send failed"}

        print(f"[sms] Sent green alert to {len(raw_numbers)} recipient(s)")
        return {"success": True, "recipients": len(raw_numbers), "response": resp_data}

    except Exception as e:
        print(f"[sms] Failed to send green alert SMS: {e}")
        return {"success": False, "error": str(e)}


def send_float_switch_2m_alert_sms(sensor_id: str) -> dict:
    if not TEXTBEE_API_KEY or not TEXTBEE_DEVICE_ID:
        print("[sms] TEXTBEE_API_KEY or TEXTBEE_DEVICE_ID not configured — skipping SMS")
        return {"success": False, "message": "textbee not configured"}

    try:
        result = client.table("profiles").select("phone_number").execute()
        raw_numbers = []
        for row in result.data or []:
            phone = row.get("phone_number")
            if phone:
                formatted = _format_phone(phone)
                if formatted and formatted not in raw_numbers:
                    raw_numbers.append(formatted)

        if not raw_numbers:
            print("[sms] No phone numbers found in profiles")
            return {"success": False, "message": "no phone numbers"}

        message = RED_ALERT_SMS_TEMPLATE

        resp_data = _send_textbee_sms(raw_numbers, message)
        if resp_data is None:
            return {"success": False, "message": "sms send failed"}

        print(f"[sms] Sent RED alert (float switch 2m) to {len(raw_numbers)} recipient(s)")
        return {"success": True, "recipients": len(raw_numbers), "response": resp_data}

    except Exception as e:
        print(f"[sms] Failed to send RED alert SMS: {e}")
        return {"success": False, "error": str(e)}


def send_float_switch_2m_all_clear_sms(sensor_id: str) -> dict:
    if not TEXTBEE_API_KEY or not TEXTBEE_DEVICE_ID:
        return {"success": False, "message": "textbee not configured"}

    try:
        result = client.table("profiles").select("phone_number").execute()
        raw_numbers = []
        for row in result.data or []:
            phone = row.get("phone_number")
            if phone:
                formatted = _format_phone(phone)
                if formatted and formatted not in raw_numbers:
                    raw_numbers.append(formatted)

        if not raw_numbers:
            return {"success": False, "message": "no phone numbers"}

        message = FLOAT_SWITCH_2M_ALL_CLEAR_SMS_TEMPLATE.format(sensor_id=sensor_id)

        resp_data = _send_textbee_sms(raw_numbers, message)
        if resp_data is None:
            return {"success": False, "message": "sms send failed"}

        print(f"[sms] Sent RED all-clear to {len(raw_numbers)} recipient(s)")
        return {"success": True, "recipients": len(raw_numbers), "response": resp_data}

    except Exception as e:
        print(f"[sms] Failed to send RED all-clear SMS: {e}")
        return {"success": False, "error": str(e)}


def send_float_switch_1m_alert_sms(sensor_id: str) -> dict:
    if not TEXTBEE_API_KEY or not TEXTBEE_DEVICE_ID:
        print("[sms] TEXTBEE_API_KEY or TEXTBEE_DEVICE_ID not configured — skipping SMS")
        return {"success": False, "message": "textbee not configured"}

    try:
        result = client.table("profiles").select("phone_number").execute()
        raw_numbers = []
        for row in result.data or []:
            phone = row.get("phone_number")
            if phone:
                formatted = _format_phone(phone)
                if formatted and formatted not in raw_numbers:
                    raw_numbers.append(formatted)

        if not raw_numbers:
            print("[sms] No phone numbers found in profiles")
            return {"success": False, "message": "no phone numbers"}

        message = YELLOW_ALERT_SMS_TEMPLATE

        resp_data = _send_textbee_sms(raw_numbers, message)
        if resp_data is None:
            return {"success": False, "message": "sms send failed"}

        print(f"[sms] Sent YELLOW alert (float switch 1m) to {len(raw_numbers)} recipient(s)")
        return {"success": True, "recipients": len(raw_numbers), "response": resp_data}

    except Exception as e:
        print(f"[sms] Failed to send YELLOW alert SMS: {e}")
        return {"success": False, "error": str(e)}


def send_float_switch_1m_all_clear_sms(sensor_id: str) -> dict:
    if not TEXTBEE_API_KEY or not TEXTBEE_DEVICE_ID:
        return {"success": False, "message": "textbee not configured"}

    try:
        result = client.table("profiles").select("phone_number").execute()
        raw_numbers = []
        for row in result.data or []:
            phone = row.get("phone_number")
            if phone:
                formatted = _format_phone(phone)
                if formatted and formatted not in raw_numbers:
                    raw_numbers.append(formatted)

        if not raw_numbers:
            return {"success": False, "message": "no phone numbers"}

        message = FLOAT_SWITCH_1M_ALL_CLEAR_SMS_TEMPLATE.format(sensor_id=sensor_id)

        resp_data = _send_textbee_sms(raw_numbers, message)
        if resp_data is None:
            return {"success": False, "message": "sms send failed"}

        print(f"[sms] Sent YELLOW all-clear to {len(raw_numbers)} recipient(s)")
        return {"success": True, "recipients": len(raw_numbers), "response": resp_data}

    except Exception as e:
        print(f"[sms] Failed to send YELLOW all-clear SMS: {e}")
        return {"success": False, "error": str(e)}


async def send_status_alert_sms(
    user_id: str,
    status: str,
    full_name: str,
    lat: float | None = None,
    lng: float | None = None,
) -> dict:
    if not TEXTBEE_API_KEY or not TEXTBEE_DEVICE_ID:
        print("[sms] TEXTBEE_API_KEY or TEXTBEE_DEVICE_ID not configured — skipping SMS")
        return {"success": False, "message": "textbee not configured"}

    try:
        recipients = await _fetch_phone_numbers(user_id)
        if not recipients:
            print("[sms] No phone numbers found for user", user_id)
            return {"success": False, "message": "no phone numbers"}

        location = _build_location(lat, lng)
        message = SMS_MESSAGE_TEMPLATE.format(
            full_name=full_name,
            status=status,
            location=location,
        )

        url = f"{TEXTBEE_API_BASE}/{TEXTBEE_DEVICE_ID}/send-sms"
        payload = {
            "recipients": recipients,
            "message": message,
        }
        headers = {
            "Content-Type": "application/json",
            "x-api-key": f"{TEXTBEE_API_KEY[:6]}...{TEXTBEE_API_KEY[-4:]}" if len(TEXTBEE_API_KEY) > 10 else TEXTBEE_API_KEY,
        }

        print(f"[sms] POST {url}")
        print(f"[sms] Request payload: {payload}")
        print(f"[sms] x-api-key header (masked): {headers['x-api-key']}")

        async with httpx.AsyncClient(timeout=15.0) as http:
            resp = await http.post(
                url,
                json=payload,
                headers={"Content-Type": "application/json", "x-api-key": TEXTBEE_API_KEY},
            )
            print(f"[sms] Response status: {resp.status_code}")
            print(f"[sms] Response body: {resp.text}")

            if resp.status_code == 422:
                print(f"[sms] Validation error details: {resp.json()}")
            resp.raise_for_status()
            result = resp.json()

        print(f"[sms] Sent alert to {len(recipients)} recipient(s) for user {user_id}")
        return {"success": True, "recipients": recipients, "response": result}

    except Exception as e:
        print(f"[sms] Failed to send SMS for user {user_id}: {e}")
        return {"success": False, "error": str(e)}
