import { supabase } from "./supabase.js";

export async function fetchActiveAnnouncements() {
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) throw error;
  return data;
}

export async function fetchAllAnnouncements() {
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createAnnouncement({ title, description, image_url, type }) {
  const user = (await supabase.auth.getUser()).data.user;
  const { data, error } = await supabase
    .from("announcements")
    .insert({ title, description, image_url, type, created_by: user?.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAnnouncement(id, updates) {
  const { data, error } = await supabase
    .from("announcements")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAnnouncement(id) {
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) throw error;
}
