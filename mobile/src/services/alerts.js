import { apiGet } from "./backend.js";

export async function fetchTcwsActive() {
  try {
    return await apiGet("/api/tcws/active");
  } catch (error) {
    console.warn("Failed to fetch active TCWS:", error);
    return [];
  }
}

export async function fetchAnnouncementsActive() {
  try {
    return await apiGet("/api/announcements/active");
  } catch (error) {
    console.warn("Failed to fetch active announcements:", error);
    return [];
  }
}

export async function fetchFamilyAlerts(userId) {
  if (!userId) return [];
  try {
    return await apiGet("/api/family-alerts/current", { user_id: userId });
  } catch (error) {
    console.warn("Failed to fetch family alerts:", error);
    return [];
  }
}
