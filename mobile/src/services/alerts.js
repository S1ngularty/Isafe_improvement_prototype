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

export async function fetchFamilyCurrentStatus(userId) {
  if (!userId) return null;
  try {
    return await apiGet("/api/family-alerts/current", { user_id: userId });
  } catch (error) {
    console.warn("Failed to fetch family current status:", error);
    return null;
  }
}

export async function fetchStatusHistory(userId, period = 7, page = 1, limit = 20) {
  if (!userId) return { data: [], total: 0 };
  try {
    return await apiGet("/api/family-alerts/history", { user_id: userId, period, page, limit });
  } catch (error) {
    console.warn("Failed to fetch status history:", error);
    return { data: [], total: 0 };
  }
}
