import { supabase } from "./supabase.js";
import { getBackendUrl } from "./backendConfig.js";

const BACKEND_URL = getBackendUrl();

export async function upsertLocation(lat, lng) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("profiles")
    .update({ lat: lat, lng: lng, last_seen_at: new Date().toISOString() })
    .eq("id", user.id)
    .select();

  if (error) throw error;
  return data;
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
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        status,
        body: message,
        payload: profileData,
        user_id: userId
      }),
    });

    const responseData = await result.json();

  } catch (err) {
    console.error("[StatusNotification] error:", err);
  }
}

export async function updateStatus(status) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("profiles")
    .update({ status })
    .eq("id", user.id)
    .select();

  if (data && data.length > 0) {
    StatusNotification({ status, userId: user.id, profileData: data[0] }).catch(
      (err) => console.error("[updateStatus] StatusNotification failed:", err)
    );
  }
  if (error) throw error;
  return data;
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

export async function getLocationHistory() {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("profiles")
    .select("lat, lng, status, last_seen_at")
    .eq("id", user.id)
    .single();

  if (error) throw error;
  return data;
}
