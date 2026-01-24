import { API_URL } from "../config";
import { apiAuthFetch } from "./apiAuthFetch";

export async function startNewSeason() {
 console.log("API_BASE:", API_URL);

 
    const res = await apiAuthFetch(`/api/seasons/new`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to start new season");
  }

  return res.json();
}



export async function getCurrentSeason() {
  const res = await apiAuthFetch("/api/seasons/current");
  if (!res.ok) throw new Error("Failed to load season");
  return res.json();
}


export async function getSeasonTeams(seasonId: number) {
  const res = await apiAuthFetch(`api/seasons/${seasonId}/teams`);
  if (!res.ok) throw new Error("Failed to load teams");
  return res.json();
}

export async function saveDraft(
  seasonId: number,
  picks: { teamId: string; playerId: string }[]
) {
  const res = await apiAuthFetch(
    `api/seasons/${seasonId}/draft`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(picks),
    }
  );

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg);
  }
}

export async function getSeasonDraft(seasonId: number) {
  const res = await apiAuthFetch(
    `/api/seasons/${seasonId}/draft`
  );

  // ✅ No draft yet (404 / empty)
  if (res.status === 404) {
    console.info("ℹ️ No draft found for season", seasonId);
    return null;
  }

  // ❌ Real failure
  if (!res.ok) {
    throw new Error(`Failed to load draft (${res.status})`);
  }

  const data = await res.json();

  // Safety: empty table but endpoint exists
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }

  return data as { teamId: string; playerId: string }[];
}

