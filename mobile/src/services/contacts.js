// services/contacts.js
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
    .select("user_id, contact_id, contact_name, contact_number, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching contacts:", error);
    throw new Error(error.message);
  }
  return data || [];
}

export async function addEmergencyContact({ name, number }) {
  const userId = await getUserId();
  const contacts = await getEmergencyContacts();

  if (contacts.length >= MAX_EMERGENCY_CONTACTS) {
    throw new Error(`You can only add up to ${MAX_EMERGENCY_CONTACTS} emergency contacts`);
  }

  const { data, error } = await supabase
    .from("contacts")
    .insert({
      user_id: userId,
      contact_name: name.trim(),
      contact_number: number.trim(),
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding contact:", error);
    throw new Error(error.message);
  }
  
  return data;
}

export async function updateEmergencyContact(contact, { name, number }) {
  const userId = await getUserId();
  
  // Use created_at as the unique identifier since there's no id column
  const { data, error } = await supabase
    .from("contacts")
    .update({
      contact_name: name.trim(),
      contact_number: number.trim(),
    })
    .eq("user_id", userId)
    .eq("created_at", contact.created_at)
    .select()
    .single();

  if (error) {
    console.error("Error updating contact:", error);
    throw new Error(error.message);
  }
  
  return data;
}

export async function deleteEmergencyContact(contact) {
  const userId = await getUserId();
  
  // Use created_at as the unique identifier
  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("user_id", userId)
    .eq("created_at", contact.created_at);

  if (error) {
    console.error("Error deleting contact:", error);
    throw new Error(error.message);
  }
}

// Helper to check if a contact exists
export async function contactExists(contactId) {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("contacts")
    .select("user_id")
    .eq("user_id", userId)
    .eq("contact_id", contactId)
    .maybeSingle();

  if (error) {
    console.error("Error checking contact:", error);
    return false;
  }
  
  return !!data;
}