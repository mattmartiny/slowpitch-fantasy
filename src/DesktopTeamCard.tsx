// DesktopTeamCard.tsx
import type { Team, PlayerTotals } from "./types";
import { getCaptainKey } from "./AuthedApp"

import { getWeeklyBench } from "./AuthedApp"; // or utils
type PendingSwap = {
    teamIdx: 0 | 1;
    night: "MON" | "FRI";
    out: string | null;
    in: string | null;
};


type Props = {
    team: Team;
    teamIdx: 0 | 1;
    total: number;
    playersByKey: Map<string, PlayerTotals>;
    isDraftComplete: boolean;
    availablePlayers: PlayerTotals[];
    pendingSwap: {
        teamIdx: 0 | 1;
        out: string | null;
        night: "MON" | "FRI";
        in: string | null;
    } | null;

    record: {
        wins: number;
        losses: number;
        ties: number;
    };


    setPendingSwap: React.Dispatch<any>;
    executeSwap: () => void;

    canEditTeam: (idx: 0 | 1) => boolean;
    isPlayerLocked: (team: Team, key: string) => boolean;
    isNightLocked: (team: Team, night: "MON" | "FRI") => boolean

    removeDrafted: (idx: 0 | 1, key: string) => void;
    doAddDrop: (
        idx: 0 | 1,
        night: "MON" | "FRI",
        dropKey: string,
        addKey: string
    ) => void;

    LockIcon: React.FC<{ locked: boolean; isCaptain?: boolean }>;
};


export function DesktopTeamCard({
    team,
    teamIdx,
    playersByKey,
    total,
    doAddDrop,
    canEditTeam,
    pendingSwap,
    availablePlayers,
    setPendingSwap,
    executeSwap,
    isPlayerLocked,
    isNightLocked,
    LockIcon,
    record,
    isDraftComplete,
}: Props) {
    function captainFirst(list: string[], captainKey: string) {
        return [...list].sort((a, b) => {
            if (a === captainKey) return -1;
            if (b === captainKey) return 1;
            return 0;
        });
    }



    console.log("🧩 pendingSwap in card", pendingSwap);
    const idx = teamIdx;
    const activeNight: "MON" | "FRI" =
        !team.processed.MON ? "MON" : "FRI";

    // 🔑 TRUE actives from state (always length 3)
    // 👀 UI-only active lineup (3 actives + captain)
    const captainKey = getCaptainKey(team);



    //     function getDisplayBench(team: Team, night: "MON" | "FRI") {
    //   const captainKey = getCaptainKey(team);
    //   return getWeeklyBench(team, night).filter(k => k !== captainKey);
    // }

const activeList = captainFirst(
  isDraftComplete
    ? team.activeByNight[activeNight]
    : team.active,
  captainKey
);

const benchList = captainFirst(
  isDraftComplete
    ? getWeeklyBench(team, activeNight)
    : team.bench,
  captainKey
);




    console.log({
        owner: team.owner,
        night: activeNight,
        captainKey,
        actives: activeList,
        bench: benchList,
    });


    return (
        <div style={{ border: "2px solid #ddd", borderRadius: 14, padding: 12 }}>
            <div key={team.owner} style={{ border: "2px solid #ddd", borderRadius: 14, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <h3 style={{ margin: 0 }}>
                        {team.owner}
                        <span style={{ marginLeft: 8, fontSize: 13, color: "#666" }}>
                            ({record.wins}-{record.losses}{record.ties ? `-${record.ties}` : ""})
                        </span>
                    </h3>

                    <div style={{ fontSize: 12, color: "#555" }}>
                        <b>Total:</b> {total} pts
                    </div>
                </div>






                {/* ACTIVE LINEUP */}
                <div style={{ marginTop: 12 }}>
                    <h4>Active Lineup</h4>

                    {activeList.map((k) => {
                        const p = playersByKey.get(k);
                        if (!p) return null;

                        const isCaptain = k === captainKey;
                        const locked = !isCaptain && isPlayerLocked(team, k);
                        const canSwapOut =
                            canEditTeam(idx) &&
                            !locked &&
                            (
                                !isNightLocked(team, activeNight) ||
                                k === captainKey
                            );
                        return (
                            <div
                                key={k}
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: 6,
                                }}
                            >
                                <div
                                    style={{
                                        padding: 8,
                                        borderRadius: 6,
                                        background: "#e9f7ef",
                                        fontWeight: 600,
                                        ...(locked ? { opacity: 0.6, filter: "grayscale(30%)" } : {}),
                                    }}
                                >
                                    🟢 {p.displayName}
                                    <LockIcon locked={locked} isCaptain={isCaptain} />
                                    {isCaptain && (
                                        <span style={{ marginLeft: 6, fontWeight: 600 }}>🧢 Captain</span>
                                    )}
                                </div>

                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <div style={{ fontWeight: 600 }}>{p.points} pts</div>

                                    <button
                                        disabled={!canSwapOut}
                                        onClick={() =>
                                            setPendingSwap({
                                                teamIdx: idx,
                                                night: activeNight,
                                                out: k,
                                                in: null,
                                            })
                                        }
                                    >
                                        Swap Out
                                    </button>

                                </div>
                            </div>
                        );
                    })}
                </div>


                {/* BENCH */}
                <div style={{ marginTop: 12 }}>
                    <h4>Bench</h4>

                    {benchList.map((k) => {
                        const p = playersByKey.get(k);
                        if (!p) return null;

                        const isCaptain = k === captainKey;

                        const lockedStyle = isPlayerLocked(team, k)
                            ? { opacity: 0.6, filter: "grayscale(30%)" }
                            : undefined;
                        const canSwapIn =
                            canEditTeam(idx) &&
                            !isPlayerLocked(team, k) &&
                            (
                                !isNightLocked(team, activeNight) ||
                                k === captainKey
                            );
                        return (
                            <div
                                key={k}
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: 6,
                                }}
                            >
                                {/* LEFT: identity */}
                                <div
                                    style={{
                                        padding: 8,
                                        borderRadius: 6,
                                        background: "#f4f4f4",
                                        color: "#555",
                                        ...lockedStyle,
                                    }}
                                >
                                    ⚪ {p.displayName}
                                    {isCaptain && (
                                        <span style={{ marginLeft: 6, fontWeight: 600 }}>🧢 Captain</span>
                                    )}

                                    <LockIcon
                                        locked={isPlayerLocked(team, k)}
                                        isCaptain={isCaptain}
                                    />
                                </div>

                                {/* RIGHT: score + swap */}
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <div style={{ fontWeight: 600 }}>
                                        {p.points} pts
                                    </div>
                                    <button
                                        disabled={!canSwapIn}
                                        onClick={() =>
                                            setPendingSwap((ps: PendingSwap | null) =>
                                                ps ? { ...ps, night: activeNight, in: k } : null
                                            )
                                        }
                                    >
                                        Swap In
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>



                {pendingSwap &&
                    pendingSwap.teamIdx === teamIdx &&
                    pendingSwap.out &&
                    pendingSwap.in && (
                        <div
                            style={{
                                marginTop: 10,
                                padding: 10,
                                borderRadius: 10,
                                background: "#f4f4f4",
                                border: "1px solid #ccc",
                            }}
                        >
                            <div style={{ fontSize: 13, marginBottom: 8 }}>
                                🔁 Swap{" "}
                                <b>{playersByKey.get(pendingSwap.out)?.displayName}</b> with{" "}
                                <b>{playersByKey.get(pendingSwap.in)?.displayName}</b>
                            </div>

                            <div style={{ display: "flex", gap: 8 }}>
                                <button
                                    onClick={executeSwap}
                                    style={{
                                        flex: 1,
                                        padding: 8,
                                        background: "#111",
                                        color: "white",
                                        borderRadius: 8,
                                    }}
                                >
                                    Confirm Swap
                                </button>

                                <button
                                    onClick={() => setPendingSwap(null)}
                                    style={{
                                        flex: 1,
                                        padding: 8,
                                        borderRadius: 8,
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}



                {/* ADD / DROP */}
                <div style={{
                    marginTop: 16,
                    paddingTop: 10,
                    borderTop: "2px solid #eee"
                }}>
                    <h4>Add / Drop</h4>

                    {(["MON", "FRI"] as const).map((night) => {
                        const used = team.addDropUsed[night];

                        return (
                            <div key={night} style={{ marginBottom: 10 }}>
                                <div style={{ fontSize: 12 }}>
                                    <b>{night === "MON" ? "Monday" : "Friday"}:</b>{" "}
                                    {used ? "❌ Used" : "✅ Available"}
                                </div>

                                {!used && (
                                    <div style={{ display: "flex", gap: 6 }}>
                                        {/* DROP */}
                                        <select id={`drop-${teamIdx}-${night}`} style={{ flex: 1 }}>
                                            <option value="">Drop…</option>

                                            {(Array.isArray(team.active) ? team.active : [])
                                                .map(k => playersByKey.get(k))
                                                .filter((p): p is PlayerTotals => Boolean(p))
                                                .map(p => (
                                                    <option key={p.key} value={p.key}>
                                                        {p.displayName}
                                                    </option>
                                                ))
                                            }

                                            {team.bench
                                                .map((k) => {
                                                    const p = playersByKey.get(k);
                                                    if (!p) return null;

                                                    return (
                                                        <option key={k} value={k}>
                                                            {p.displayName} (bench)
                                                        </option>
                                                    );
                                                })}


                                        </select>

                                        {/* ADD */}
                                        <select id={`add-${teamIdx}-${night}`} style={{ flex: 1 }}>
                                            <option value="">Add…</option>
                                            {availablePlayers
                                                .filter(p => p.leagues.includes(night))
                                                .map(p => (
                                                    <option key={p.key} value={p.key}>
                                                        {p.displayName}
                                                    </option>
                                                ))}
                                        </select>

                                        <button
                                            onClick={() => {
                                                const drop = (document.getElementById(`drop-${teamIdx}-${night}`) as HTMLSelectElement)?.value;
                                                const add = (document.getElementById(`add-${teamIdx}-${night}`) as HTMLSelectElement)?.value;
                                                if (!drop || !add) return alert("Select both drop and add.");
                                                doAddDrop(teamIdx as 0 | 1, night, drop, add);
                                            }}
                                        >
                                            Execute
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div >
    );
}
