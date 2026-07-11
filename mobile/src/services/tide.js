import { apiGet } from "./backend.js";

export async function getTideData() {
  return apiGet("/api/tide");
}
