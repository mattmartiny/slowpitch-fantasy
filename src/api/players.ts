import { apiAuthFetch } from "./apiAuthFetch";

export async function getPlayers() {
  const res = await apiAuthFetch("/api/players");
  if (!res.ok) throw new Error("Failed to load players");
  return res.json();
}
