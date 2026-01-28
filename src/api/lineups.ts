import { apiAuthFetch } from "./apiAuthFetch";

export type WeeklyLineupRow = {
  teamId: string;
  playerId: string;
  slot: "active"; // ✅ DB stores actives ONLY
  night: "MON" | "FRI";
};

export type WeeklyLineupsResponse = {
  lineup: WeeklyLineupRow[];
};



export async function getWeeklyLineups(seasonId: number, week: number) {
  const res = await apiAuthFetch(
     `/api/lineups/${seasonId}/${week}`
  );

  // ✅ No lineup submitted yet
  if (res.status === 404) {
    console.info("ℹ️ No weekly lineup found", { seasonId, week });
    return null;
  }

  // ❌ Real failure
  if (!res.ok) {
    throw new Error(`Failed to load weekly lineups (${res.status})`);
  }

  const data = await res.json();

  // Safety
  if (!Array.isArray(data)) {
    return [];
  }

  return data as {
    teamId: string;
    playerId: string;
    slot: "active";
    night: "MON" | "FRI"
  }[];
}

// ==============================
// Lineup Snapshots (editable)
// ==============================

export type LineupSnapshotPlayer = {
  playerId: string;
  slot: "active" | "bench";
  isCaptain: boolean;
};

export type SaveLineupPayload = {
  seasonId: number;
  teamId: string;
  players: LineupSnapshotPlayer[];
};

export async function saveLineup(payload: SaveLineupPayload) {
  const res = await apiAuthFetch("/api/lineups", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Failed to save lineup (${res.status})`);
  }
}



export async function getLatestLineup(
  seasonId: number,
  teamId: string
) {
  const res = await apiAuthFetch(
    `/api/lineups/latest?seasonId=${seasonId}&teamId=${teamId}`
  );

  // ✅ This is NOT an error
  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error(`Failed to load latest lineup (${res.status})`);
  }

  return res.json();
}
