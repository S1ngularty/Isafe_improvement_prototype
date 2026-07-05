import { apiGet } from "./backend.js";

export async function getFamilyCurrentStatus(userId) {
  return apiGet("/api/family-alerts/current", { user_id: userId });
}

export async function getStatusHistory(userId, period = 7, page = 1, limit = 20) {
  return apiGet("/api/family-alerts/history", { user_id: userId, period, page, limit });
}

export async function getMemberProfile(targetUserId, currentUserId) {
  return apiGet(`/api/family-alerts/member/${targetUserId}`, { user_id: currentUserId });
}
