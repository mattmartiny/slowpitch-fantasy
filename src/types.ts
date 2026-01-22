export type LeagueTag = "MON" | "FRI";

export type PlayerTotals = {
  playerId: string; // ← REQUIRED for saving draft
  key: string;
  displayName: string;
  leagues: LeagueTag[];
  PA: number;
  AB: number;
  _1B: number;
  _2B: number;
  _3B: number;
  HR: number;
  BB: number;
  R: number;
  RBI: number;
  ROE: number;
  OUT: number;
  points: number;
  ptsPerPA: number;
};
export type OrderedTeam = readonly [Team, 0 | 1];


/**
 * CAPTAIN RULES
 * - Captain is app-only (not persisted to DB)
 * - Captain may be active or benched
 * - Captain is never locked
 * - Captain scores once per night if active + played
 */
export type Team = {
  teamId:string;
    owner: string;
  starters: string[];
  bench: string[];

  // ✅ NEW (night-specific)
  activeByNight: {
    MON: string[];
    FRI: string[];
  };

  lockedByNight: {
    MON: string[];
    FRI: string[];
  };

  locked: string[]; // keep for UI / compatibility

  processed: {
    MON: boolean;
    FRI: boolean;
  };

  addDropUsed: {
    MON: boolean;
    FRI: boolean;
  };




};
export type PendingSwap = {
  teamIdx: 0 | 1;
  out: string | null;
    night: "MON" | "FRI";
  in: string | null;
} | null;


export type Night = "MON" | "FRI";

export type TeamState = {
  roster: {
    [playerKey: string]: {
      MON: "active" | "bench";
      FRI: "active" | "bench";
    };
  };
  captain: {
    MON: string | null;
    FRI: string | null;
  };
};
