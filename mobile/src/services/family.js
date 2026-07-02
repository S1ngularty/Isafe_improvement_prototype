import { supabase } from "./supabase.js";

export async function createFamily(name) {
  const { data, error } = await supabase.rpc("create_family", { family_name: name });
  if (error) throw new Error(error.message || "Failed to create family");
  return data;
}

export async function joinFamily(code) {
  const { data, error } = await supabase.rpc("join_family", { family_code: code });
  if (error) throw new Error(error.message || "Failed to join family");
  return data;
}

export async function getMyFamily() {
  const { data: familyId } = await supabase.rpc("get_my_family_id");
  if (!familyId) return null;

  const { data, error } = await supabase
    .from("families")
    .select("id, name, code, created_by, created_at")
    .eq("id", familyId)
    .single();

  if (error) return null;
  return data;
}

export async function getFamilyMembers() {
  const { data, error } = await supabase.rpc("get_family_members");
  if (error) return [];
  return data;
}

export async function leaveFamily() {
  const { error } = await supabase.rpc("leave_family");
  if (error) throw new Error(error.message || "Failed to leave family");
}
