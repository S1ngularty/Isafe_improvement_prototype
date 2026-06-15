import { supabase } from "./supabase.js";

export async function upsertLocation(lat, lng) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("profiles")
    .update({ lat: lat, lng: lng, last_seen_at: new Date().toISOString() })
    .eq("id", user.id)
    .select();

  console.log("[upsertLocation] update:", { lat: lat, lng: lng, userId: user.id, data, error });
  if (error) throw error;
  return data;
}

export async function updateStatus(status) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("profiles")
    .update({ status })
    .eq("id", user.id)
    .select();

  console.log("[updateStatus] update:", { status, userId: user.id, data, error });
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

  console.log("[updateLocationSharing] update:", { enabled, userId: user.id, error });
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
