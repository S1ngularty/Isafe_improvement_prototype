import { supabase } from "./supabase.js";

export async function createFamily(name) {
  const { data, error } = await supabase.rpc("create_family", { family_name: name });
  if (error) throw new Error(error.message);
  return data;
}

export async function joinFamily(code) {
  const { data, error } = await supabase.rpc("join_family", { family_code: code });
  if (error) throw new Error(error.message);
  return data;
}

export async function getMyFamily() {
  const { data: familyId, error: rpcErr } = await supabase.rpc("get_my_family_id");
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

export async function getFamilyMembersPaginated(limit = 10, offset = 0) {
  const { data, error } = await supabase.rpc("get_family_members_paginated", {
    page_limit: limit,
    page_offset: offset,
  });
  if (error) return { members: [], total: 0 };
  const total = data.length > 0 ? Number(data[0].total_count) : 0;
  const members = data.map(({ total_count, ...m }) => m);
  return { members, total };
}

export async function leaveFamily() {
  const { error } = await supabase.rpc("leave_family");
  if (error) throw new Error(error.message);
}

export async function removeFamilyMember(targetId) {
  const { error } = await supabase.rpc("remove_family_member", { target_id: targetId });
  if (error) throw new Error(error.message);
}

export async function promoteFamilyMember(targetId) {
  const { error } = await supabase.rpc("promote_family_member", { target_id: targetId });
  if (error) throw new Error(error.message);
}

export async function demoteFamilyMember(targetId) {
  const { error } = await supabase.rpc("demote_family_member", { target_id: targetId });
  if (error) throw new Error(error.message);
}
