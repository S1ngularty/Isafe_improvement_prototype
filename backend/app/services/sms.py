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
