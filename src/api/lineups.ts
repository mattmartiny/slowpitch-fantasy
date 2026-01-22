import { authFetch } from "./authFetch";

export type WeeklyLineupRow = {
  teamId: string;
  playerId: string;
  slot: "active"; // ✅ DB stores actives ONLY
  night: "MON" | "FRI";
};

export type WeeklyLineupsResponse = {
  lineup: WeeklyLineupRow[];
};

export async function getWeeklyLineups(
  seasonId: number,
  week: number
): Promise<WeeklyLineupsResponse> {
  const res = await authFetch(
    `http://localhost:5000/api/lineups/${seasonId}/${week}`
  );

  if (!res.ok) {
    throw new Error("Failed to load weekly lineups");
  }

  return res.json();
}
