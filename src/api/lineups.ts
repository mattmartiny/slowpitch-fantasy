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


// export async function getWeeklyLineups(
//   seasonId: number,
//   week: number
// ): Promise<WeeklyLineupsResponse> {
//   const res = await apiAuthFetch(
  
//   );

//   if (!res.ok) {
//     throw new Error("Failed to load weekly lineups");
//   }

//   return res.json();
// }
