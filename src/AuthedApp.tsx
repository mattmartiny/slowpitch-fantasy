



import { useEffect, useMemo, useState, useRef } from "react";
import Papa from "papaparse";
import { getCurrentSeason, getSeasonTeams, getSeasonDraft } from "./api/seasons";
import { getPlayers } from "./api/players";
import type { LeagueTag, Team, PlayerTotals, OrderedTeam } from "./types";
import { DesktopTeamCard } from "./DesktopTeamCard";
import { MobileTeamCard } from "./MobileTeamCard";
import { DesktopPlayerPool } from "./DesktopPlayerPool";
import { MobilePlayerPool } from "./MobilePlayerPool";
import { NewSeasonButton } from "./components/NewSeasonButton";
import { saveDraft } from "./api/seasons";
import { getWeeklyLineups, } from "./api/lineups";
import { WeeklyHistory } from "./components/WeeklyHistory";
import { apiAuthFetch } from "./api/apiAuthFetch";
import type { AuthUser } from "./auth/useAuth";


type WeekResult = {
  week: number;
  scores: [number, number];
  locked: [string[], string[]];
  processedAt: string;
};

// ----------------------
// Scoring (LOCKED)
// ----------------------
const SCORING = {
  s1b: 1.0,
  s2b: 1.5,
  s3b: 2.5,
  shr: 3.0,
  bb: 0.5,
  r: 1.0,
  rbi: 0.75,
  roe: 1.0,
  out: -0.5,
} as const;


type AppState = {
  week: number;
  history: WeekResult[];
  owners: [string, string];
  sources: { MON?: string; FRI?: string };
  uploads: { MON: PlayerTotals[]; FRI: PlayerTotals[] };
  pool: PlayerTotals[];
  teams: [Team, Team];
  weeklyHydrated: boolean;
  teamsHydrated: boolean;
};

const LS_KEY = "slowpitch-fantasy-mvp-state-v4";

// ----------------------
// Helpers
// ----------------------
const num = (v: unknown) => {
  const x = typeof v === "number" ? v : Number(String(v ?? "").trim());
  return Number.isFinite(x) ? x : 0;
};

const norm = (s: string) => s.trim().toLowerCase();

export function getWeeklyBench(team: Team, night: "MON" | "FRI") {
  const active = Array.isArray(team.active) ? team.active : [];
  const bench = Array.isArray(team.bench) ? team.bench : [];
  const activesByNight = team.activeByNight?.[night] ?? [];

  const roster = new Set([...active, ...bench]);
  const actives = new Set(activesByNight);

  return Array.from(roster).filter(k => !actives.has(k));
}


function extractBattingHeaderMap(headerRow: string[]) {
  const tbIndex = headerRow.findIndex((h) => (h ?? "").trim() === "TB");
  if (tbIndex === -1) throw new Error("TB column not found – invalid GameChanger export");

  const battingHeaders = headerRow.slice(0, tbIndex + 1).map((h) => (h ?? "").trim());
  const map: Record<string, number> = {};
  battingHeaders.forEach((h, i) => {
    if (h) map[h] = i;
  });
  return map;
}

function parseGameChangerTotals(text: string, league: LeagueTag): PlayerTotals[] {
  // Parse as raw rows (arrays) so we can use column INDEXES (avoids duplicate header collisions)
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });
  if (parsed.errors?.length) {
    console.warn(parsed.errors);
  }
  const rows = parsed.data;
  if (!rows || rows.length < 3) return [];

  // GameChanger often uses header row at index 1
  const headerRow = rows[1].map((c) => String(c ?? "").trim());
  const idx = extractBattingHeaderMap(headerRow);

  const out: PlayerTotals[] = [];

  for (const row of rows.slice(2)) {
    if (!row || row.every((c) => String(c ?? "").trim() === "")) continue;

    const first = String(row[idx["First"]] ?? "").trim();
    const last = String(row[idx["Last"]] ?? "").trim();
    const name = (last ? `${first} ${last}` : first).trim();
    if (!name) continue;

    const key = norm(name);

    const PA = num(row[idx["PA"]]);
    const AB = num(row[idx["AB"]]);
    const _1B = num(row[idx["1B"]]);
    const _2B = num(row[idx["2B"]]);
    const _3B = num(row[idx["3B"]]);
    const HR = num(row[idx["HR"]]);
    const BB = num(row[idx["BB"]]);
    const R = num(row[idx["R"]]);
    const RBI = num(row[idx["RBI"]]);
    const ROE = idx["ROE"] !== undefined ? num(row[idx["ROE"]]) : 0;

    // Sanity checks (catch wrong imports)
    if (HR > AB) throw new Error(`Invalid batting data for ${name}: HR > AB`);
    if (_1B + _2B + _3B + HR > AB) throw new Error(`Invalid batting data for ${name}: hits > AB`);

    const OUT = AB - (_1B + _2B + _3B + HR);

    const points =
      _1B * SCORING.s1b +
      _2B * SCORING.s2b +
      _3B * SCORING.s3b +
      HR * SCORING.shr +
      BB * SCORING.bb +
      R * SCORING.r +
      RBI * SCORING.rbi +
      ROE * SCORING.roe +
      OUT * SCORING.out;

    out.push({
      key,
      displayName: name,
      playerId: "",
      leagues: [league],
      PA,
      AB,
      _1B,
      _2B,
      _3B,
      HR,
      BB,
      R,
      RBI,
      ROE,
      OUT,
      points,
      ptsPerPA: PA > 0 ? points / PA : 0,
    });
  }

  return out;
}





function mergePools(mon: PlayerTotals[], fri: PlayerTotals[]) {
  const map = new Map<string, PlayerTotals>();

  for (const p of [...mon, ...fri]) {
    const existing = map.get(p.key);
    if (!existing) {
      map.set(p.key, p);
      continue;
    }

    const PA = existing.PA + p.PA;
    const AB = existing.AB + p.AB;
    const _1B = existing._1B + p._1B;
    const _2B = existing._2B + p._2B;
    const _3B = existing._3B + p._3B;
    const HR = existing.HR + p.HR;
    const BB = existing.BB + p.BB;
    const R = existing.R + p.R;
    const RBI = existing.RBI + p.RBI;
    const ROE = existing.ROE + p.ROE;

    const OUT = AB - (_1B + _2B + _3B + HR);

    const points =
      _1B * SCORING.s1b +
      _2B * SCORING.s2b +
      _3B * SCORING.s3b +
      HR * SCORING.shr +
      BB * SCORING.bb +
      R * SCORING.r +
      RBI * SCORING.rbi +
      ROE * SCORING.roe +
      OUT * SCORING.out;

    map.set(p.key, {
      ...existing,
      leagues: Array.from(new Set([...existing.leagues, ...p.leagues])),
      PA,
      AB,
      _1B,
      _2B,
      _3B,
      HR,
      BB,
      R,
      RBI,
      ROE,
      OUT,
      points,
      ptsPerPA: PA > 0 ? points / PA : 0,
    });
  }

  return Array.from(map.values()).sort((a, b) => b.points - a.points);
}


function blankTeam(
  db?: { teamId: string; name: string }
): Team {
  return {
    teamId: db?.teamId ?? "",
    owner: db?.name ?? "",
    ownerUserId: "__UNASSIGNED__", 

    active: [],
    bench: [],

    captainKey: "",

    activeByNight: {
      MON: [],
      FRI: [],
    },

    lockedByNight: {
      MON: [],
      FRI: [],
    },

    locked: [],

    processed: {
      MON: false,
      FRI: false,
    },

    seasonAddDropsUsed: 0,



  };
}




function emptyState(): AppState {
  return {
    weeklyHydrated: false,
    teamsHydrated: false,
    week: 1,
    history: [],
    owners: ["", ""],
    sources: {},
    uploads: { MON: [], FRI: [] },
    pool: [],
    teams: [
      blankTeam({ teamId: "", name: "" }),
      blankTeam({ teamId: "", name: "" }),
    ],
  };
}

type DbTeam = {
  teamId: string;
  name: string;
  ownerUserId: string;
  captainKey?: string;
};

function buildPoolFromDb(
  dbPlayers: { playerId: string; name: string }[]
): PlayerTotals[] {
  return dbPlayers
    .filter(p => {
      const name = p.name?.trim();
      return Boolean(name);
    })
    .map(p => ({
      key: p.name.trim().toLowerCase(),
      displayName: p.name.trim(),
      playerId: p.playerId,
      leagues: [],
      PA: 0,
      AB: 0,
      _1B: 0,
      _2B: 0,
      _3B: 0,
      HR: 0,
      BB: 0,
      R: 0,
      RBI: 0,
      ROE: 0,
      OUT: 0,
      points: 0,
      ptsPerPA: 0,
    }));
}



export function getCaptainKey(team: Team): string {
  if (!team.captainKey) {
    throw new Error(`Captain not set for team ${team.teamId}`);
  }
  return team.captainKey;
}

export function maybeCaptainKey(team: Team): string | null {
  return team.captainKey || null;
}



export function AuthedApp({
  auth,
  setAuth,
}: {
  auth: AuthUser;
  setAuth: React.Dispatch<
    React.SetStateAction<AuthUser | null | undefined>
  >;
}) {
  //  ALL your existing hooks go here
  // dbTeams, state, effects, everything


  function getTeamRecord(
    history: WeekResult[],
    teamIdx: 0 | 1
  ): { wins: number; losses: number; ties: number } {
    let wins = 0;
    let losses = 0;
    let ties = 0;

    for (const week of history) {
      const myScore = week.scores[teamIdx];
      const oppScore = week.scores[teamIdx === 0 ? 1 : 0];

      if (myScore > oppScore) wins++;
      else if (myScore < oppScore) losses++;
      else ties++;
    }

    return { wins, losses, ties };
  }


  const [dbTeams, setDbTeams] = useState<
    { teamId: string; name: string, captainKey: string, ownerUserId: string }[] | null
  >(null);
  const [dbPlayers, setDbPlayers] = useState<{ playerId: string; name: string }[]>([]);
  const [draftReady, setDraftReady] = useState(false);
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const isVisitor = auth?.role === "visitor";

  const [state, setState] = useState<AppState>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return emptyState();

      const parsed = JSON.parse(raw) as AppState;





      //  MIGRATION GUARD (for older saved states)
      parsed.teams.forEach((t) => {

        //  MIGRATE lockedByNight
        if (!t.lockedByNight) {
          t.lockedByNight = {
            MON: [],
            FRI: [],
          };
        }

        if (typeof t.seasonAddDropsUsed !== "number") {
          t.seasonAddDropsUsed = 0;
        }


        if (!t.processed) {
          t.processed = { MON: false, FRI: false };
        }


        if (typeof parsed.week !== "number") {
          parsed.week = 1;
        }

        if (!Array.isArray(parsed.history)) {
          parsed.history = [];
        }

        if (typeof parsed.week !== "number") {
          parsed.week = parsed.history.length + 1;
        }


      });

      return parsed;
    } catch {
      return emptyState();
    }
  });






  const weeklyLineupLoadedRef = useRef(false);
  const bootstrappedRef = useRef(false);

  function ensureCaptainOnRoster(team: Team) {
    if (!team.captainKey) return;

    const roster = new Set([...team.active, ...team.bench]);

    if (!roster.has(team.captainKey)) {
      // Prefer bench if possible
      if (team.bench.length < 2) {
        team.bench.push(team.captainKey);
      } else {
        team.active.push(team.captainKey);
      }
    }
  }

  useEffect(() => {
    if (!auth) return;
    if (!state.pool.length) return;
    if (bootstrappedRef.current) return;

    bootstrappedRef.current = true;
    console.log("BOOTSTRAP SEASON");

    (async () => {
      try {
        // 1️ Load season
        const season = await getCurrentSeason();
        setSeasonId(season.seasonId);

        // 2️ Load teams (identity only)
        const teamsFromApi = await getSeasonTeams(season.seasonId);
        setDbTeams(teamsFromApi);

        // 3️ Load draft ONCE (authoritative roster)
        const draft = await getSeasonDraft(season.seasonId);

        setState(prev => {
          // ─────────────────────────────
          // A. Normalize teams (IDENTITY ONLY)
          // ─────────────────────────────
          const teams = teamsFromApi.map((dbTeam: DbTeam) => {

            const existing = prev.teams.find(t => t.teamId === dbTeam.teamId);

            return {
              ...(existing ?? blankTeam(dbTeam)),
              teamId: dbTeam.teamId,
              ownerUserId: dbTeam.ownerUserId,
              owner: dbTeam.name,
              name: dbTeam.name,

              // 🔥 NEVER trust cached roster
              active: [],
              bench: [],
            };
          }) as [Team, Team];

          // ─────────────────────────────
          // B. Apply draft → roster (ONLY SOURCE)
          // ─────────────────────────────
          if (draft && draft.length) {
            const teamIndexById = new Map<string, 0 | 1>();
            teams.forEach((t, i) =>
              teamIndexById.set(t.teamId, i as 0 | 1)
            );

            const keyByPlayerId = new Map<string, string>();
            prev.pool.forEach(p => {
              if (p.playerId && p.key) {
                keyByPlayerId.set(p.playerId, p.key);
              }
            });

            const ownedBy: [string[], string[]] = [[], []];

            for (const pick of draft) {
              const idx = teamIndexById.get(pick.teamId);
              const key = keyByPlayerId.get(pick.playerId);
              if (idx === undefined || !key) continue;
              ownedBy[idx].push(key);
            }

            teams.forEach((team, idx) => {
              if (ownedBy[idx].length === 6) {
                team.active = ownedBy[idx].slice(0, 4);
                team.bench = ownedBy[idx].slice(4);
              }
            });
          }

          // ─────────────────────────────
          // C. Restore captain identity
          // ─────────────────────────────
          teams.forEach(team => {
            const dbTeam = teamsFromApi.find((t: { teamId: string; }) => t.teamId === team.teamId);
            if (dbTeam?.captainKey) {
              team.captainKey = dbTeam.captainKey;
            }

            // Captain must exist on roster
            if (team.captainKey) {
              const roster = new Set([...team.active, ...team.bench]);
              if (!roster.has(team.captainKey)) {
                team.bench.push(team.captainKey);
              }
            }
          });

          // ─────────────────────────────
          // D. Seed weekly actives (ONLY IF EMPTY)
          // ─────────────────────────────
          // teams.forEach(team => {
          //   if (!team.activeByNight) {
          //     team.activeByNight = { MON: [], FRI: [] };
          //   }

          //   const hasWeekly =
          //     team.activeByNight.MON.length > 0 ||
          //     team.activeByNight.FRI.length > 0;

          //   if (!hasWeekly && team.active.length === 4) {
          //     team.activeByNight.MON = [...team.active];
          //     team.activeByNight.FRI = [...team.active];
          //   }
          // });

          console.log(" BOOTSTRAP FINAL", teams.map(t => ({
            owner: t.owner,
            active: t.active,
            bench: t.bench,
            MON: t.activeByNight.MON,
            FRI: t.activeByNight.FRI,
          })));

          return {
            ...prev,
            week: season.currentWeek,
            teams,
            teamsHydrated: true,
          };
        });

        setDraftReady(true);
        console.log(" BOOTSTRAP COMPLETE");
      } catch (err) {
        bootstrappedRef.current = false;
        console.error(" BOOTSTRAP FAILED", err);
      }
    })();
  }, [auth, state.pool.length]);



  function applyWeeklyLineups(
    state: AppState,
    rows: {
      teamId: string;
      playerId: string;
      night: "MON" | "FRI" | string;
      slot: "active";
    }[],

    pool: PlayerTotals[]
  ): AppState {
    const teams = structuredClone(state.teams);

    // If NO DB rows at all → seed actives ONLY if UI empty & unprocessed
    if (!rows.length) {
      teams.forEach(team => {
        ensureCaptainOnRoster(team);
        if (
          team.activeByNight.MON.length === 0 &&
          team.activeByNight.FRI.length === 0 &&
          !team.processed.MON &&
          !team.processed.FRI
        ) {
          team.activeByNight.MON = [...team.active];
          team.activeByNight.FRI = [...team.active];
        }
      });

      return { ...state, teams };
    }

    // DB teamId → index (SAFE)
    const teamIdxById = new Map<string, 0 | 1>();
    state.teams.forEach((t, idx) => {
      teamIdxById.set(t.teamId, idx as 0 | 1);
    });


    // playerId → key (string-safe)
    const keyByPlayerId = new Map<string, string>();
    pool.forEach(p => {
      if (typeof p.playerId === "string" && typeof p.key === "string") {
        keyByPlayerId.set(p.playerId, p.key);
      }
    });

    // Actives per team per night (explicit typing — no `unknown[]`)
    const activesByTeamNight: {
      0: { MON: string[]; FRI: string[] };
      1: { MON: string[]; FRI: string[] };
    } = {
      0: { MON: [], FRI: [] },
      1: { MON: [], FRI: [] },
    };

    // Collect DB rows (NO inference, NO fallback nights)
    for (const row of rows) {
      const teamIdx = teamIdxById.get(row.teamId);
      if (teamIdx === undefined) continue;

      if (row.night !== "MON" && row.night !== "FRI") continue;

      const key = keyByPlayerId.get(row.playerId);
      if (!key) continue;

      activesByTeamNight[teamIdx][row.night].push(key);
    }

    // 🔄 Apply hydration — PER NIGHT, NEVER unified
    teams.forEach((team, idx) => {
      const teamIdx = idx as 0 | 1;

      (["MON", "FRI"] as const).forEach(night => {
        const actives = Array.from(
          new Set(activesByTeamNight[teamIdx][night])
        ).slice(0, 4);

        // If DB has NO rows for this night → DO NOT TOUCH UI
        if (!actives.length) return;

        team.activeByNight[night] = [...actives];
      });

      //  DO NOT TOUCH starters/bench here. Ever.
    });


    // 🛡️ Safety invariant check (dev-only)
    teams.forEach((team) => {
      const roster = [...team.active, ...team.bench];
      if (roster.length !== 6) {
        console.warn("❌ ROSTER CORRUPTION", team.owner, roster);
      }
    });

    console.log(" Weekly lineup hydrated (SAFE per-night)", teams.map(t => ({
      owner: t.owner,
      MON: t.activeByNight.MON,
      FRI: t.activeByNight.FRI,
      starters: t.active,
      bench: t.bench,
    })));

    return { ...state, teams };
  }





  async function saveWeeklyLineupFromTeam(args: {
    seasonId: number;
    week: number;
    dbTeamId: string;
    night: "MON" | "FRI";
    activeKeys: string[];
    pool: PlayerTotals[];
  }) {
    const { seasonId, week, dbTeamId, night, activeKeys, pool } = args;

    const activePlayerIds = activeKeys
      .map(key => pool.find(p => p.key === key))
      .filter((p): p is PlayerTotals => !!p?.playerId)
      .map(p => p.playerId);

    const res = await apiAuthFetch(`/api/lineups/${seasonId}/${week}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamId: dbTeamId,
        night,
        active: activePlayerIds,
      }),
    });

    if (res instanceof Response && !res.ok) {
      const text = await res.text().catch(() => "");
      console.error(" saveWeeklyLineupFromTeam failed", {
        status: res.status,
        night,
        activeKeys,
        activePlayerIds,
        text,
      });
    } else {
      console.log(" saved weekly lineup to DB", {
        week,
        night,
        teamId: dbTeamId,
        activeKeys,
        activeCount: activePlayerIds.length,
      });
    }
  }



  const isMobile = useMemo(
    () => window.matchMedia("(max-width: 768px)").matches,
    []
  );


  const teamIdx = useMemo<0 | 1 | null>(() => {
    if (!auth) return null;

    if (auth.teamId) {
      const idx = state.teams.findIndex(
        t => t.teamId === auth.teamId
      );
      return idx === 0 || idx === 1 ? idx : null;
    }

    // NO NAME FALLBACK — WRONG TEAM IS WORSE THAN NO TEAM
    return null;
  }, [auth, state.teams]);


  useEffect(() => {
    console.log("AUTH / TEAM IDX", {
      auth,
      teamIdx,
      teams: state.teams.map(t => ({
        owner: t.owner,
        teamId: t.teamId,
        starters: t.active,
        bench: t.bench,
      })),
    });
  }, [auth, teamIdx, state.teams]);



  const [pendingSwap, setPendingSwap] = useState<{
    teamIdx: 0 | 1;
    night: "MON" | "FRI";
    out: string | null;
    in: string | null;
  } | null>(null);



  useEffect(() => {
    if (!auth?.userId) return;
    if (auth.teamId) return;
    if (!state.teams.length) return;

    const myTeam = state.teams.find(
      t => t.ownerUserId === auth.userId
    );

    if (!myTeam) {
      console.warn("No team found for user", auth.userId);
      return;
    }

    setAuth(prev =>
      prev ? { ...prev, teamId: myTeam.teamId } : prev
    );
  }, [auth?.userId, auth?.teamId, state.teams, setAuth]);



  const poolReady = state.pool.length > 0;


  useEffect(() => {
    if (!seasonId) return;
    if (!dbTeams || dbTeams.length < 2) return;
    if (!poolReady) return;
    if (!draftReady) return;
    if (!state.teamsHydrated) return;

    //  Only block duplicate calls in THIS render cycle
    if (weeklyLineupLoadedRef.current) return;

    weeklyLineupLoadedRef.current = true;

    getWeeklyLineups(seasonId, state.week).then((lineup) => {
      const rows = lineup ?? [];

      if (rows.length === 0) {
        setState(prev => {
          const teams = structuredClone(prev.teams);

          teams.forEach(team => {
            if (
              team.activeByNight.MON.length === 0 &&
              team.activeByNight.FRI.length === 0
            ) {
              team.activeByNight.MON = [...team.active];
              team.activeByNight.FRI = [...team.active];
            }
          });

          return { ...prev, teams };
        });

        return;
      }

      setState(prev =>
        applyWeeklyLineups(prev, rows, prev.pool)
      );
    });
  }, [
    seasonId,
    state.week,
    dbTeams,
    poolReady,
    draftReady,
    state.teamsHydrated,
  ]);


  useEffect(() => {
    weeklyLineupLoadedRef.current = false;
  }, [seasonId, state.week]);



  useEffect(() => {
    if (!auth) return;
    if (!seasonId || !dbTeams) return;




    apiAuthFetch(`/api/scores/season/${seasonId}`)
      .then(async res => {



        if (res.status === 404) {
          console.info("ℹ No scores yet — waiting for games");
          return null;
        }
        else if (!res.ok && res.status !== 404) {
          console.warn(" Failed to load scores", res.status);
          return {};
        }
        return res.json();
      })
      .then((byWeek: unknown) => {
        if (!byWeek || typeof byWeek !== "object") return;

        const history: WeekResult[] = Object.entries(byWeek).map(
          ([weekStr, scoresByTeam]) => {
            const scores = scoresByTeam as Record<string, number> | undefined;
            return {
              week: Number(weekStr),
              scores: [
                scores?.[dbTeams[0].teamId] ?? 0,
                scores?.[dbTeams[1].teamId] ?? 0,
              ],
              locked: [[], []],
              processedAt: "",
            };
          }
        );

        setState(s => ({ ...s, history }));
      })
      .catch(err => {
        console.error(" Error loading weekly scores", err);
      });
  }, [auth, seasonId, dbTeams]);

  useEffect(() => {
    console.log(" teamsHydrated", {
      teamsHydrated: state.teamsHydrated,
      team0Active: state.teams[0]?.active,
      team1Active: state.teams[1]?.active,
    });
  }, [state.teamsHydrated]);

  useEffect(() => {
    console.log("AUTH READY", auth);
  }, [auth]);

  useEffect(() => {
    console.log("SEASON ID", seasonId);
  }, [seasonId]);

  useEffect(() => {
    console.log("DB TEAMS", dbTeams);
  }, [dbTeams]);

  useEffect(() => {
    console.log("DB PLAYERS", dbPlayers.length);
  }, [dbPlayers]);



  useEffect(() => {
    console.log("POST HYDRATION STATE", {
      team0: state.teams[0].activeByNight,
      team1: state.teams[1].activeByNight,
    });
  }, [state.teams]);


  useEffect(() => {
    console.log("POOL READY:", state.pool.map(p => ({
      name: p.displayName,
      playerId: p.playerId
    })));
  }, [state.pool]);

  useEffect(() => {
    console.log("UPLOAD STATE", {
      MON: state.uploads.MON.length,
      FRI: state.uploads.FRI.length,
      pool: state.pool.length
    });
  }, [state.uploads, state.pool]);


  const isDraftComplete = useMemo(() => {
    return state.teams.every(
      (t) =>
        Array.isArray(t.active) &&
        Array.isArray(t.bench) &&
        t.active.length + t.bench.length === 6
    );
  }, [state.teams]);

  useEffect(() => {
    if (!dbPlayers.length) return;

    setState(prev => {
      // If pool already exists (CSV uploaded), do nothing
      if (prev.pool.length > 0) {
        return prev;
      }


      console.log(" Initializing pool from DB players");

      return {
        ...prev,
        pool: buildPoolFromDb(dbPlayers),
      };
    });
  }, [dbPlayers]);



  useEffect(() => {
    if (!state.pool.length || !state.teamsHydrated) return;

    const invalid = state.teams.some(
      t => t.active.length === 0 && t.bench.length === 6
    );

    if (invalid) {
      console.warn(" Prevented saving broken roster state");
      return;
    }

    localStorage.setItem(LS_KEY, JSON.stringify(state));
  }, [state]);





  const playersByKey = useMemo(() => new Map(state.pool.map((p) => [p.key, p] as const)), [state.pool]);
  useEffect(() => {
    console.log("Player keys:", state.pool.map(p => p.key));
  }, [state.pool]);

  const isTaken = (key: string) =>
    state.teams.some(
      t =>
        Array.isArray(t.active) && t.active.includes(key) ||
        Array.isArray(t.bench) && t.bench.includes(key)
    );


  function getWeeklyScore(team: Team): number {
    let total = 0;

    (["MON", "FRI"] as const).forEach(night => {
      if (!team.processed[night]) return;

      //  ONLY active players score
      const actives = team.activeByNight[night];

      actives.forEach(key => {
        const p = playersByKey.get(key);
        if (!p || p.PA === 0) return;

        total += p.points;
      });
    });

    return total;
  }





  useEffect(() => {
    console.log(" ACTIVES", state.teams.map(t => ({
      owner: t.owner,
      MON: t.activeByNight.MON,
      FRI: t.activeByNight.FRI,
    })));
  }, [state.teams]);


  const isNightLocked = (team: Team, night: "MON" | "FRI") =>
    team.processed[night];






  // const [auth, setAuth] = useState<AuthState>({ teamIdx: null });

  const isCommissioner = auth?.name.toLowerCase() === "martiny";
  const canEditTeam = (idx: 0 | 1) =>
    state.teams[idx].ownerUserId === auth.userId;

  function logout() {
    if (!confirm("Log out?")) return;
    localStorage.removeItem("fantasy_jwt");
    localStorage.removeItem(LS_KEY);
    window.location.reload();
  }


  useEffect(() => {
    if (!auth) return;

    console.log("👥 LOADING PLAYERS");

    getPlayers()
      .then(players => {
        console.log("PLAYERS LOADED", players.length);
        setDbPlayers(players);
      })
      .catch(err => {
        console.error("PLAYERS FAILED", err);
      });
  }, [auth]);


  const availablePlayers = useMemo(
    () =>
      state.pool.filter(
        p =>
          p.key &&
          p.displayName &&
          !isTaken(p.key)
      ),
    [state.pool, state.teams]
  );


  const teamTotals = useMemo(() => {
    return state.teams.map((team) => getWeeklyScore(team)) as [number, number];
  }, [state.teams, playersByKey]);


  const teamRecords = useMemo(() => {
    return state.teams.map((_, idx) =>
      getTeamRecord(state.history, idx as 0 | 1)
    ) as [
        { wins: number; losses: number; ties: number },
        { wins: number; losses: number; ties: number }
      ];
  }, [state.history]);



  // Guard: teams not ready yet
  const orderedTeams = useMemo<OrderedTeam[]>(() => {
    if (!state.teams || state.teams.length < 2) {
      return [];
    }

    if (teamIdx === null) {
      return state.teams.map(
        (team, idx) => [team, idx as 0 | 1]
      );
    }

    return teamIdx === 0
      ? [
        [state.teams[0], 0],
        [state.teams[1], 1],
      ]
      : [
        [state.teams[1], 1],
        [state.teams[0], 0],
      ];
  }, [teamIdx, state.teams]);


  useEffect(() => {
    console.log("UPLOADS", {
      mon: state.uploads.MON.length,
      fri: state.uploads.FRI.length,
    });
  }, [state.uploads]);



  async function upload(file: File, league: LeagueTag) {
    if (!isCommissioner) return;

    console.log("UPLOAD START – observing lineup only", {
      teams: state.teams.map(t => ({
        owner: t.owner,
        MON: t.activeByNight.MON,
        FRI: t.activeByNight.FRI,
        starters: t.active,
        bench: t.bench,
        processed: t.processed,
      })),
    });

    const text = await file.text();
    const parsedPlayers = parseGameChangerTotals(text, league);

    // 🔁 Sync players to DB (idempotent)
    await apiAuthFetch(`/api/players/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsedPlayers.map(p => ({ name: p.displayName }))),
    });

    // 🔒 Prevent DB hydration races for this week
    // prevent *this render* from re-triggering hydration
    // without blocking future week reloads


    setState(prev => {
      // 🧊 Freeze lineup intent BEFORE we touch anything
      const frozenLineups = prev.teams.map(t => ({
        active: {
          MON: [...t.activeByNight.MON],
          FRI: [...t.activeByNight.FRI],
        },
        starters: [...t.active],
        bench: [...t.bench],
        lockedByNight: {
          MON: [...t.lockedByNight.MON],
          FRI: [...t.lockedByNight.FRI],
        },
        locked: [...t.locked],
        processed: { ...t.processed },
      }));

      /* -------------------------
         1️. APPLY STATS ONLY
         ------------------------- */

      const uploads =
        league === "MON"
          ? { MON: parsedPlayers, FRI: prev.uploads.FRI }
          : { MON: prev.uploads.MON, FRI: parsedPlayers };

      const mergedStats = mergePools(uploads.MON, uploads.FRI);
      const statsByKey = new Map(mergedStats.map(p => [p.key, p] as const));

      const updatedPool = prev.pool.map(p => {
        const stats = statsByKey.get(p.key);
        return stats
          ? {
            ...p,
            PA: stats.PA,
            AB: stats.AB,
            _1B: stats._1B,
            _2B: stats._2B,
            _3B: stats._3B,
            HR: stats.HR,
            BB: stats.BB,
            R: stats.R,
            RBI: stats.RBI,
            ROE: stats.ROE,
            OUT: stats.OUT,
            points: stats.points,
            ptsPerPA: stats.ptsPerPA,
          }
          : {
            ...p,
            PA: 0,
            AB: 0,
            _1B: 0,
            _2B: 0,
            _3B: 0,
            HR: 0,
            BB: 0,
            R: 0,
            RBI: 0,
            ROE: 0,
            OUT: 0,
            points: 0,
            ptsPerPA: 0,
          };
      });

      /* -------------------------
         2️. LOCK PLAYERS WHO PLAYED
         ------------------------- */

      const teams = structuredClone(prev.teams);

      teams.forEach((team, idx) => {
        if (team.processed[league]) return;

        const playedKeys = new Set(uploads[league].map(p => p.key));
        const captainKey = maybeCaptainKey(team);

        // If no captain yet, skip locking logic
        if (!captainKey) return;

        // Lock only players who:
        // - were ACTIVE (per frozen intent)
        // - appeared in the upload
        // - are NOT the captain
        const newlyLocked = frozenLineups[idx].active[league].filter(
          k => playedKeys.has(k) && k !== captainKey
        );

        team.lockedByNight[league] = Array.from(
          new Set([...team.lockedByNight[league], ...newlyLocked])
        );

        team.locked = Array.from(
          new Set([...team.lockedByNight.MON, ...team.lockedByNight.FRI])
        );

        team.processed[league] = true;
      });

      /* -------------------------
         3. FIRST UPLOAD SYNC RULE
         - If this is the FIRST upload of the week for a team,
           force MON and FRI actives to match the uploaded night’s lineup.
         ------------------------- */

      teams.forEach((team, idx) => {
        const wasFirstUploadForTeam =
          !frozenLineups[idx].processed.MON && !frozenLineups[idx].processed.FRI;

        if (!wasFirstUploadForTeam) return;

        const synced = [...frozenLineups[idx].active[league]].slice(0, 4);

        team.activeByNight.MON = synced;
        team.activeByNight.FRI = synced;
      });

      /* -------------------------
         4. RESTORE LINEUP INTENT
         - IMPORTANT: do NOT overwrite actives on FIRST upload,
           or you undo the sync above.
         ------------------------- */

      teams.forEach((team, idx) => {
        const wasFirstUploadForTeam =
          !frozenLineups[idx].processed.MON && !frozenLineups[idx].processed.FRI;

        // Only restore actives on NON-first uploads
        if (!wasFirstUploadForTeam) {
          team.activeByNight.MON = frozenLineups[idx].active.MON;
          team.activeByNight.FRI = frozenLineups[idx].active.FRI;
        }

        // Always restore roster (draft roster must never change from uploads)
        team.active = frozenLineups[idx].starters;
        team.bench = frozenLineups[idx].bench;
      });

      console.log("POST UPLOAD STATE", teams.map(t => ({
        owner: t.owner,
        MON: t.activeByNight.MON,
        FRI: t.activeByNight.FRI,
        starters: t.active,
        bench: t.bench,
        processed: t.processed,
        lockedByNight: t.lockedByNight,
      })));

      return {
        ...prev,
        uploads,
        pool: updatedPool,
        teams,
        weeklyHydrated: true,
        sources: {
          ...prev.sources,
          [league]: file.name,
        },
      };
    });
  }




  // const isLoggedIn = !!localStorage.getItem(TOKEN_KEY);

  // if (!isLoggedIn) {
  //   return <Login onSuccess={() => window.location.reload()} />;
  // }


  function processNightWithoutUpload(night: "MON" | "FRI") {
    if (!confirm(`Process ${night} without upload?`)) return;

    setState((s) => {
      const teams = structuredClone(s.teams);

      for (const team of teams) {
        if (team.processed[night]) continue;

        // 🚨 CAPTAIN GUARD
        // if (!team.captain[night]) {
        //   alert(`${team.owner} has no captain set for ${night}.`);
        //   return s;
        // }

        team.processed[night] = true;
      }

      return { ...s, teams };
    });
  }

  function isWeekComplete(state: AppState) {
    return state.teams.every(
      (t) => t.processed.MON && t.processed.FRI
    );
  }


  function resetAll() {
    if (!isCommissioner) return;

    if (!confirm("Reset uploads + pool + drafted teams?")) return;
    setState(emptyState());
  }
  const isSavingDraft = useRef(false);
  async function handleSaveDraft() {
    if (!seasonId) {
      alert("Season not loaded yet");
      return;
    }

    if (!confirm("Save current draft to database?")) return;

    //  Prevent autosave /state from firing
    isSavingDraft.current = true;

    try {
      // 🔹 BUILD PICKS HERE (this was missing)
      const picks: { teamId: string; playerId: string }[] = [];

      for (const team of state.teams) {
        // Match fantasy team → DB team
        const dbTeam = dbTeams?.find(t => t.teamId === team.teamId);

        if (!dbTeam) continue;

        for (const key of [...team.active, ...team.bench]) {
          const player = state.pool.find(p => p.key === key);

          // playerId MUST exist to save
          if (!player?.playerId) continue;

          picks.push({
            teamId: dbTeam.teamId,
            playerId: player.playerId,
          });
        }
      }

      if (!picks.length) {
        alert("No draft picks to save");
        return;
      }

      await saveDraft(seasonId, picks);
      alert("Draft saved successfully");
    } catch (err) {
      console.error(err);
      alert("Failed to save draft");
    } finally {
      isSavingDraft.current = false;
    }
  }



  function addActive(idx: 0 | 1, key: string) {
    if (teamIdx === null) return;

    const canEdit =
      idx === teamIdx ||
      (isCommissioner && !isDraftComplete);

    if (!canEdit) return;

    if (isDraftComplete) return;

    setState(s => {
      const teams = structuredClone(s.teams);
      const team = teams[idx]; // IMPORTANT: use idx, not teamIdx

      if (team.active.length >= 4) return s;
      if (isTaken(key)) return s;

      team.active.push(key);
      team.bench = team.bench.filter(k => k !== key);

      return { ...s, teams };
    });
  }


  function assertNoCrossDuplicates(team: Team) {
    if (process.env.NODE_ENV !== "development") return;

    const all = [...team.active, ...team.bench];
    const dupes = all.filter((k, i) => all.indexOf(k) !== i);

    if (dupes.length) {
      console.warn("DUPLICATE PLAYER ACROSS ROSTER", dupes, team);
    }
  }


  function setBench(idx: 0 | 1, key: string) {
    if (teamIdx === null) return;

    const canEdit =
      idx === teamIdx ||
      (isCommissioner && !isDraftComplete);

    if (!canEdit) return;

    if (isDraftComplete) return;

    setState(s => {
      const teams = structuredClone(s.teams);
      const team = teams[idx];

      if (team.bench.length >= 2) return s;
      if (isTaken(key)) return s;

      team.bench.push(key);
      team.active = team.active.filter(k => k !== key);

      team.activeByNight.MON =
        team.activeByNight.MON.filter(k => k !== key);
      team.activeByNight.FRI =
        team.activeByNight.FRI.filter(k => k !== key);

      return { ...s, teams };
    });
  }





  function removeDrafted(teamIdx: 0 | 1, key: string) {
    setState((s) => {
      const teams = structuredClone(s.teams);
      const team = teams[teamIdx];

      // Remove from starters
      team.active = team.active.filter(k => k !== key);

      // Remove from bench
      team.bench = team.bench.filter(k => k !== key);

      // Remove from BOTH nights
      team.activeByNight.MON = team.activeByNight.MON.filter(k => k !== key);
      team.activeByNight.FRI = team.activeByNight.FRI.filter(k => k !== key);
      assertNoCrossDuplicates(team);

      return { ...s, teams };
    });
  }

  useEffect(() => {
    if (!state.week || !seasonId) return;
  }, [state.week]);


  async function startNewWeek() {
    if (!isCommissioner) return;

    if (!isWeekComplete(state)) {
      alert("Week is not complete yet.");
      return;
    }

    if (!confirm("Finalize this week and start a new one?")) return;

    // 1️ Save week result locally (UI history)
    setState(s => {
      const historyEntry: WeekResult = {
        week: s.week,
        scores: [
          getWeeklyScore(s.teams[0]),
          getWeeklyScore(s.teams[1]),
        ],
        locked: [
          [...s.teams[0].locked],
          [...s.teams[1].locked],
        ],
        processedAt: new Date().toISOString(),
      };

      return {
        ...s,
        history: [...s.history, historyEntry],
      };
    });

    await apiAuthFetch(
      `/api/scores/${seasonId}/${state.week}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([
          {
            teamId: state.teams[0].teamId,
            score: getWeeklyScore(state.teams[0]),
          },
          {
            teamId: state.teams[1].teamId,
            score: getWeeklyScore(state.teams[1]),
          },
        ]),
      }
    );

    // 2️ Tell backend to advance the week (authoritative)
    await apiAuthFetch(
      `/api/seasons/${seasonId}/advance-week`,
      { method: "POST" }
    );

    // 3️ Re-fetch authoritative season state
    const season = await getCurrentSeason();

    // 4️ Reset weekly-only state (STRICT tuple-safe reset)
    setState(s => {
      const teams: [Team, Team] = [
        {
          ...s.teams[0],
          locked: [],
          lockedByNight: { MON: [], FRI: [] },
          processed: { MON: false, FRI: false },
          seasonAddDropsUsed: 0,
        },
        {
          ...s.teams[1],
          locked: [],
          lockedByNight: { MON: [], FRI: [] },
          processed: { MON: false, FRI: false },
          seasonAddDropsUsed: 0,
        },
      ];

      return {
        ...s,
        week: season.currentWeek,
        uploads: { MON: [], FRI: [] },
        sources: {},
        teams,
        weeklyHydrated: false,
      };
    });
  }
  function forceSwap(list: string[], out: string, inKey: string) {
    const next = list.filter(k => k !== out && k !== inKey);

    // Prefer replacing the last slot
    next.push(inKey);

    return next.slice(0, 4);
  }



  function swapInList(list: string[], out: string, inKey: string) {
    const i = list.indexOf(out);
    if (i === -1) return list; // out isn't active; don't mutate
    const next = [...list];
    next[i] = inKey;

    // de-dupe while preserving order
    const seen = new Set<string>();
    return next.filter(k => (seen.has(k) ? false : (seen.add(k), true))).slice(0, 4);
  }




  async function executeSwap() {
    if (!pendingSwap) return;

    const { teamIdx, night, out, in: inKey } = pendingSwap;
    if (!out || !inKey) return;
    if (!seasonId || !dbTeams) return;

    const team = state.teams[teamIdx];
    const captainKey = getCaptainKey(team);

    const nightsToApply: ("MON" | "FRI")[] =
      out === captainKey || inKey === captainKey
        ? (["MON", "FRI"] as const).filter(n => !team.processed[n])
        : [night];

    // Pre-validation
    // 1️ VALIDATION (once)
    for (const n of nightsToApply) {
      if (team.processed[n] && out !== captainKey && inKey !== captainKey) {
        alert("Only the captain may be swapped after games are processed.");
        return;
      }

      if (team.lockedByNight[n].includes(out) && out !== captainKey) {
        alert("That player has already played and cannot be swapped.");
        return;
      }
    }

    // 2️ COMPUTE next state (once)
    const nextActiveByNight: Record<"MON" | "FRI", string[]> = {
      MON: [...team.activeByNight.MON],
      FRI: [...team.activeByNight.FRI],
    };

    for (const n of nightsToApply) {
      // Apply the actual swap
      nextActiveByNight[n] =
        nextActiveByNight[n].includes(out)
          ? swapInList(nextActiveByNight[n], out, inKey)
          : forceSwap(nextActiveByNight[n], out, inKey);

      // Captain invariant (only if night not processed)
      if (
        !nextActiveByNight[n].includes(captainKey) &&
        !team.processed[n]
      ) {
        nextActiveByNight[n] = forceSwap(
          nextActiveByNight[n],
          nextActiveByNight[n][0],
          captainKey
        );
      }
    }



    // 3️3 UPDATE UI (once)
    setState(prev => {
      const teams = structuredClone(prev.teams);
      const t = teams[teamIdx];

      (["MON", "FRI"] as const).forEach(n => {
        if (nightsToApply.includes(n)) {
          t.activeByNight[n] = nextActiveByNight[n];
        }
      });

      return { ...prev, teams, weeklyHydrated: true };
    });

    setPendingSwap(null);

    // 4️ SAVE TO DB (per night)
    for (const n of nightsToApply) {
      await saveWeeklyLineupFromTeam({
        seasonId,
        week: state.week,
        dbTeamId: dbTeams[teamIdx].teamId,
        night: n,
        activeKeys: nextActiveByNight[n],
        pool: state.pool,
      });
    }

  }



  function isPlayerLocked(team: Team, key: string, night: "MON" | "FRI") {
    return team.lockedByNight[night].includes(key);
  }



  function doAddDrop(
    teamIdx: 0 | 1,
    dropKey: string,
    addKey: string
  ) {
    setState((s) => {
      const teams: [Team, Team] = structuredClone(s.teams);
      const team = teams[teamIdx];

      // Max 2 per season
      if (team.seasonAddDropsUsed >= 2) {
        alert("You have used all 2 add/drops for the season.");
        return s;
      }

      // Captain guard
      if (dropKey === getCaptainKey(team)) {
        alert("You cannot drop the captain.");
        return s;
      }

      const dropPlayer = s.pool.find(p => p.key === dropKey);
      const addPlayer = s.pool.find(p => p.key === addKey);

      if (!dropPlayer || !addPlayer) return s;

      // REMOVE dropped player everywhere
      team.active = team.active.filter(k => k !== dropKey);
      team.bench = team.bench.filter(k => k !== dropKey);
      team.activeByNight.MON = team.activeByNight.MON.filter(k => k !== dropKey);
      team.activeByNight.FRI = team.activeByNight.FRI.filter(k => k !== dropKey);

      // ADD new player
      // Prefer bench if room, else active
      if (team.bench.length < 2) {
        team.bench.push(addKey);
      } else {
        team.active.push(addKey);
      }

      team.seasonAddDropsUsed += 1;

      assertNoCrossDuplicates(team);

      return { ...s, teams };
    });
  }


  function LockIcon({ locked }: { locked: boolean }) {
    return locked ? (
      <span title="Locked (already played)">🔒</span>
    ) : (
      <span title="Unlocked">🔓</span>
    );
  }

  useEffect(() => {
    console.log(" appReady debug", {
      auth: !!auth,
      seasonId,
      dbTeamsLoaded: dbTeams !== null,
      dbTeamsLength: dbTeams?.length,
      teamIds: state.teams.map(t => t.teamId),
      poolLength: state.pool.length,
    });
  }, [auth, seasonId, dbTeams, state.teams, state.pool]);



  const appReady =
    !!auth &&
    seasonId !== null &&
    dbTeams !== null &&
    dbTeams.length === 2 &&
    state.teams.every(
      t =>
        t.teamId &&
        t.ownerUserId &&
        t.owner &&
        Array.isArray(t.active) &&
        Array.isArray(t.bench)
    )
  const appReadyDebug = state.teams.map((t, i) => ({
    idx: i,
    teamId: Boolean(t.teamId),
    ownerUserId: Boolean(t.ownerUserId),
    owner: Boolean(t.owner),
    activeIsArray: Array.isArray(t.active),
    benchIsArray: Array.isArray(t.bench),
    raw: {
      teamId: t.teamId,
      ownerUserId: t.ownerUserId,
      owner: t.owner,
      active: t.active,
      bench: t.bench,
    },
  }));



  if (!appReady) {
    {
      console.log("appReady breakdown", {
        auth: Boolean(auth),
        seasonId,
        dbTeamsLoaded: Boolean(dbTeams),
        dbTeamsLength: dbTeams?.length,
        teams: appReadyDebug,
      });
    }
    return <div>Loading…</div>;
  }


  return (
    <div style={{ padding: 16, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif", maxWidth: 1200, margin: "0 auto" }}>




      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
          padding: "8px 12px",
          borderRadius: 10,
          background: "#f6f6f6",
        }}
      >
        <div style={{ fontSize: 12, color: "#444" }}>
          Logged in as{" "}
          <b>
            {auth?.name}
            {isCommissioner && " (Commissioner)"}
          </b>
        </div>

        <button
          onClick={logout}
          style={{
            fontSize: 12,
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid #ccc",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          🔁 Switch Team
        </button>
      </div>



      <h1 style={{ margin: 0 }}>Slowpitch Fantasy</h1>
      <h2 style={{ marginTop: 8 }}>
        Week {state.week}
      </h2>
      {isCommissioner && (
        <>
          <p style={{ marginTop: 6, color: "#444" }}>
            Upload Monday + Friday <b>Totals</b> CSVs. <b>Batting only</b>
          </p>
          <div style={{ opacity: isCommissioner ? 1 : 0.5 }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span><b>Monday totals</b></span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  disabled={!isCommissioner}
                  onChange={async (e) => {
                    if (!isCommissioner) return;

                    const file = e.target.files?.[0];
                    if (!file) return;

                    await upload(file, "MON");
                    // processNight("MON");
                  }}
                />


                <small style={{ color: "#666" }}>{state.sources.MON ? `Loaded: ${state.sources.MON}` : "Not loaded"}</small>
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span><b>Friday totals</b></span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  disabled={!isCommissioner}
                  onChange={async (e) => {
                    if (!isCommissioner) return;

                    const file = e.target.files?.[0];
                    if (!file) return;

                    await upload(file, "FRI");
                    // processNight("FRI");
                  }}
                />
                <small style={{ color: "#666" }}>{state.sources.FRI ? `Loaded: ${state.sources.FRI}` : "Not loaded"}</small>
              </label>

              <h3 style={{ marginTop: 16 }}>Game Processing</h3>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button
                  disabled={state.teams.every(t => t.processed.MON)}
                  onClick={() => processNightWithoutUpload("MON")}
                >
                  ▶️ Process Monday (no upload)
                </button>

                <button
                  disabled={state.teams.every(t => t.processed.FRI)}
                  onClick={() => processNightWithoutUpload("FRI")}
                >
                  ▶️ Process Friday (no upload)
                </button>
              </div>

              <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
                Monday: {state.teams[0].processed.MON ? "✅ Processed" : "⏳ Pending"} ·
                Friday: {state.teams[0].processed.FRI ? "✅ Processed" : "⏳ Pending"}
              </div>

              <button
                onClick={resetAll}
                style={{
                  height: 40,
                  padding: "0 12px",
                  borderRadius: 10,
                  border: "1px solid #bbb",
                  background: isCommissioner ? "white" : "#eee",
                  color: isCommissioner ? "#000" : "#999",
                }}
              >
                Reset
              </button>

              {!isCommissioner && (
                <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>
                  Commissioner only
                </div>
              )}


              <button
                onClick={startNewWeek}
                style={{
                  marginTop: 12,
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #111",
                  background: "#111",
                  color: "white",
                }}
              >
                🔄 Start New Week
              </button>


              <div style={{ marginTop: 12 }}>
                <NewSeasonButton />
              </div>



              <button
                onClick={handleSaveDraft}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #006400",
                  background: "#006400",
                  color: "white",
                }}
              >
                💾 Save Draft
              </button>
            </div>

          </div>

        </>
      )}
      

      <h2 style={{ marginTop: 18 }}>Teams</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: 12,
        }}
      >
        {orderedTeams.map(([team, idx]) => {
          return isMobile ? (
            <MobileTeamCard
              key={team.ownerUserId}
              team={team}
              teamIdx={idx}
              total={teamTotals[idx]}
              record={teamRecords[idx]}
              playersByKey={playersByKey}
              pendingSwap={pendingSwap}
              setPendingSwap={setPendingSwap}
              seasonId={seasonId}
              doAddDrop={doAddDrop}
              executeSwap={executeSwap}
              canEditTeam={canEditTeam}
              isPlayerLocked={isPlayerLocked}
              isNightLocked={isNightLocked}
              LockIcon={LockIcon}
              readOnly={isVisitor}
              isDraftComplete={isDraftComplete}
            />
          ) : (
            <DesktopTeamCard
              key={team.ownerUserId}
              team={team}
              teamIdx={idx}
              total={teamTotals[idx]}
              record={teamRecords[idx]}
              isDraftComplete={isDraftComplete}
              availablePlayers={availablePlayers}
              removeDrafted={removeDrafted}
              doAddDrop={doAddDrop}
              playersByKey={playersByKey}
              canEditTeam={canEditTeam}
              pendingSwap={pendingSwap}
              seasonId={seasonId}
              setPendingSwap={setPendingSwap}
              executeSwap={executeSwap}
              isPlayerLocked={isPlayerLocked}
              isNightLocked={isNightLocked}
              readOnly={isVisitor}
              LockIcon={LockIcon}
            />
          );
        })}

      </div>
      <button onClick={() => setShowHistory(s => !s)}>
         {showHistory ? "Hide" : "Show"} Weekly History
      </button>

      {showHistory && (
        state.history.length > 0 ? (
          <WeeklyHistory
            history={state.history}
            owners={state.owners}
          />
        ) : (
          <div style={{ marginTop: 12, color: "#666" }}>
            No completed weeks yet.
          </div>
        )
      )}
      {!isMobile ? (
        <DesktopPlayerPool
          pool={state.pool}
          isTaken={isTaken}
          addActive={addActive}
          setBench={setBench}
          teams={state.teams}

          isDraftComplete={isDraftComplete}
          availablePlayers={availablePlayers}
        />
      ) : (
        <MobilePlayerPool
          pool={state.pool}
          isTaken={isTaken}
          addActive={addActive}
          setBench={setBench}
          teams={state.teams}
          isDraftComplete={isDraftComplete}
        />
      )}

    </div>
  );
}

