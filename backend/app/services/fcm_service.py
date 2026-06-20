import json
import os
from pathlib import Path
from typing import Any, Dict, Optional

try:
    import firebase_admin
    from firebase_admin import credentials, messaging
except Exception:  # pragma: no cover - imported at runtime if installed
    firebase_admin = None  # type: ignore


_app = None


def _default_service_account_path() -> Path:
    return Path(__file__).resolve().parents[2] / "FIREBASE_SERVICE_ACCOUNT.json"


def _load_certificate() -> tuple[Optional[Any], Optional[str]]:
    cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT")
    cred_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")

    if cred_path:
        if os.path.exists(cred_path):
            return credentials.Certificate(cred_path), None

        backend_root = Path(__file__).resolve().parents[2]
        for candidate in (
            backend_root / cred_path,
            backend_root / f"{cred_path}.json",
        ):
            if candidate.exists():
                return credentials.Certificate(str(candidate)), None

        return None, "could not locate service account JSON from FIREBASE_SERVICE_ACCOUNT"

    if cred_json:
        if os.path.exists(cred_json):
            return credentials.Certificate(cred_json), None

        try:
            cred_dict = json.loads(cred_json)
        except Exception:
            return None, "FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON or a path to a file"

        return credentials.Certificate(cred_dict), None

    default_path = _default_service_account_path()
    if default_path.exists():
        return credentials.Certificate(str(default_path)), None

    return None, "no firebase credentials configured (set FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_JSON)"


def init_firebase() -> Optional[str]:
    global _app
    if firebase_admin is None:
        return "firebase_admin not installed"

    if _app is not None:
        return None

    cred, error = _load_certificate()
    if error:
        return error
    if cred is None:
        return "could not load Firebase credentials"

    _app = firebase_admin.initialize_app(cred)
    return None


def send_fcm_message(token: str, title: str, body: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Send an FCM notification to a single device token.

    Requires initialization via `init_firebase()` beforehand.
    """
    if firebase_admin is None:
        raise RuntimeError("firebase_admin package is not installed")

    if _app is None:
        init_error = init_firebase()
        if init_error:
            raise RuntimeError(init_error)

    message = messaging.Message(
        token=token,
        notification=messaging.Notification(title=title, body=body),
        data={k: str(v) for k, v in (data or {}).items()},
    )

    resp = messaging.send(message)
    return {"message_id": resp}
