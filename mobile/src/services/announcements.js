import { supabase } from "./supabase.js";

export async function fetchActiveAnnouncements() {
  const { data, error } = await supabase
    .from("announcements")
    .select("id, title, description, image_url, type")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function fetchAllAnnouncements() {
  const { data, error } = await supabase
    .from("announcements")
    .select("id, title, description, image_url, type, is_active, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createAnnouncement(announcement) {
  const { data, error } = await supabase
    .from("announcements")
    .insert([
      {
        title: announcement.title,
        description: announcement.description,
        image_url: announcement.image_url,
        type: announcement.type || "image",
        is_active: true,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAnnouncement(id, updates) {
  const { data, error } = await supabase
    .from("announcements")
    .update(updates)
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

export async function toggleAnnouncementActive(id, isActive) {
  return updateAnnouncement(id, { is_active: isActive });
}
