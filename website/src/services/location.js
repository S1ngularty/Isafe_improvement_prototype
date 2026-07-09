import { supabase } from "./supabase.js";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

export async function upsertLocation(lat, lng) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("profiles")
    .update({ lat, lng, last_seen_at: new Date().toISOString() })
    .eq("id", user.id)
    .select();

  if (error) throw error;
}

async function StatusNotification({ status, userId, profileData }) {
  let message = "";
  const name = profileData?.full_name || "Someone";
  const currentStatus = status ? status.trim() : "";

  switch (currentStatus) {
    case "safe":
      message = `${name} wants to remind you that they are safe!`;
      break;
    case "help":
      message = `${name} is asking for help, tap the banner to show their full status`;
      break;
    case "emergency":
      message = `${name} is in emergency, please click the notification banner to show their location and take action immediately!`;
      break;
  }

  try {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;

    const result = await fetch(`${BACKEND_URL}/api/notify/contacts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        status,
        body: message,
        payload: profileData,
        user_id: userId,
      }),
    });

    if (!result.ok) {
      const errorText = await result.text();
      console.warn("[StatusNotification] notification request failed:", result.status, errorText);
    } else {
      const responseData = await result.json();
    }
  } catch (err) {
    console.error("[StatusNotification] error:", err);
  }
}

export async function updateStatus(status) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error("Not authenticated");

  let freshCoords = null;

  try {
    freshCoords = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => {
          console.warn("[updateStatus] geolocation failed:", err.message);
          resolve(null);
        },
        { timeout: 5000, enableHighAccuracy: true },
      );
    });
  } catch (err) {
    console.warn("[updateStatus] geolocation error:", err);
  }

  const updateFields = { status };
  if (freshCoords) {
    updateFields.lat = freshCoords.lat;
    updateFields.lng = freshCoords.lng;
    updateFields.last_seen_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updateFields)
    .eq("id", user.id)
    .select();

  const profileData = data && data.length > 0 ? { ...data[0], ...(freshCoords || {}) } : null;

  if (profileData) {
    StatusNotification({ status, userId: user.id, profileData }).catch(
      (err) => console.error("[updateStatus] StatusNotification failed:", err),
    );
  }

  if (error) throw error;
}

export async function updateLocationSharing(enabled) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("profiles")
    .update({ location_sharing: enabled })
    .eq("id", user.id);

  if (error) throw error;
}
