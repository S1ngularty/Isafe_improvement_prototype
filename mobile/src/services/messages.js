import { supabase } from "./supabase.js";

export async function fetchFamilyMessages(familyId) {
  const { data, error } = await supabase
    .from("family_messages")
    .select(`
      id,
      content,
      created_at,
      sender_id,
      profiles:sender_id (
        full_name,
        avatar_url
      )
    `)
    .eq("family_id", familyId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

export async function sendFamilyMessage(familyId, senderId, content) {
  const { data, error } = await supabase
    .from("family_messages")
    .insert([
      {
        family_id: familyId,
        sender_id: senderId,
        content: content,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export function subscribeToFamilyMessages(familyId, callback) {
  return supabase
    .channel(`public:family_messages:family_id=eq.${familyId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "family_messages",
        filter: `family_id=eq.${familyId}`,
      },
      (payload) => {
        // Fetch the sender's profile for the newly inserted message
        // since Postgres CDC payload doesn't include the join
        supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", payload.new.sender_id)
          .single()
          .then(({ data: profile }) => {
            const enrichedMessage = {
              ...payload.new,
              profiles: profile,
            };
            callback(enrichedMessage);
          });
      }
    )
    .subscribe();
}
