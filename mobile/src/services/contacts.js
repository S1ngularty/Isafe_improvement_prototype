import { supabase } from "./supabase.js";

export const MAX_EMERGENCY_CONTACTS = 5;

async function getUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw new Error(error.message);
  if (!user) throw new Error("Not authenticated");

  return user.id;
}

export async function getEmergencyContacts() {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("contacts")
    .select("contact_id, contact_name, contact_number, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function addEmergencyContact({ name, number }) {
  const userId = await getUserId();
  const contacts = await getEmergencyContacts();

  if (contacts.length >= MAX_EMERGENCY_CONTACTS) {
    throw new Error(`You can only add up to ${MAX_EMERGENCY_CONTACTS} emergency contacts`);
  }

  const { error } = await supabase.from("contacts").insert({
    user_id: userId,
    contact_name: name.trim(),
    contact_number: number.trim(),
  });

  if (error) throw new Error(error.message);
}

export async function updateEmergencyContact(originalContact, { name, number }) {
  const userId = await getUserId();
  const { error } = await supabase
    .from("contacts")
    .update({
      contact_name: name.trim(),
      contact_number: number.trim(),
    })
    .eq("user_id", userId)
    .eq("created_at", originalContact.created_at);

  if (error) throw new Error(error.message);
}

export async function deleteEmergencyContact(contact) {
  const userId = await getUserId();
  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("user_id", userId)
    .eq("created_at", contact.created_at);

  if (error) throw new Error(error.message);
}

