// DesktopTeamCard.tsx
import type { Team, PlayerTotals } from "./types";
import React from "react";
import { maybeCaptainKey, getWeeklyBench } from "./AuthedApp";
import { saveLineup } from "./api/lineups";
function captainFirst(list: string[], captainKey: string | null) {
    if (!captainKey) return list;
    return [...list].sort((a, b) => {
        if (a === captainKey) return -1;
        if (b === captainKey) return 1;
        return 0;
    });
}



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
    record: {
        wins: number;
        losses: number;
        ties: number;
    };

    playersByKey: Map<string, PlayerTotals>;
    availablePlayers: PlayerTotals[];
    isDraftComplete: boolean;

    pendingSwap: PendingSwap | null;
    setPendingSwap: React.Dispatch<
        React.SetStateAction<PendingSwap | null>
    >;
    executeSwap: () => void;

    canEditTeam: (idx: 0 | 1) => boolean;
    isPlayerLocked: (team: Team, key: string, night: "MON" | "FRI") => boolean;
    isNightLocked: (team: Team, night: "MON" | "FRI") => boolean;

    removeDrafted: (idx: 0 | 1, key: string) => void;
    doAddDrop: (
        idx: 0 | 1,
        dropKey: string,
        addKey: string
    ) => void;
    seasonId: number;
    LockIcon: React.FC<{ locked: boolean; isCaptain?: boolean }>;
    readOnly?: boolean;
};


export function DesktopTeamCard(props: Props) {
    const {
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
        seasonId,
        readOnly = false,
    } = props;

    const idx = teamIdx;

    const activeNight: "MON" | "FRI" =
        !team.processed.MON ? "MON" : "FRI";

    // captainKey is nullable during bootstrap/new season
    const captainKey = maybeCaptainKey(team);

    const baseActives = isDraftComplete
        ? (team.activeByNight?.[activeNight] ?? [])
        : (Array.isArray(team.active) ? team.active : []);

    const baseBench = isDraftComplete
        ? getWeeklyBench(team, activeNight)
        : (Array.isArray(team.bench) ? team.bench : []);

    const activeList = captainFirst(baseActives, captainKey);
    const benchList = captainFirst(baseBench, captainKey);


    console.log({
        owner: team.owner,
        night: activeNight,
        captainKey,
        actives: activeList,
        bench: benchList,
    });
    async function handleSaveLineup() {
        if (!editable) return;
        const players: {
            playerId: string;
            slot: "active" | "bench";
            isCaptain: boolean;
        }[] = [];

        // ACTIVE
        for (const key of team.active) {
            const p = playersByKey.get(key);
            if (!p?.playerId) continue;

            players.push({
                playerId: p.playerId,
                slot: "active",
                isCaptain: key === team.captainKey
            });
        }

        // BENCH
        for (const key of team.bench) {
            const p = playersByKey.get(key);
            if (!p?.playerId) continue;

            players.push({
                playerId: p.playerId,
                slot: "bench",
                isCaptain: key === team.captainKey
            });
        }

        await saveLineup({
            seasonId: seasonId,
            teamId: team.teamId,
            players
        });

        alert("Lineup saved");
    }
    const editable = !readOnly && canEditTeam(teamIdx);
    const [showAddDrop, setShowAddDrop] = React.useState(false);
    const [dropKey, setDropKey] = React.useState("");
    const [addKey, setAddKey] = React.useState("");



    const rosterKeys = Array.from(
        new Set([...(team.active ?? []), ...(team.bench ?? [])])
    );

    const droppable = rosterKeys.filter(
        k => k !== team.captainKey
    );

    const addDropDisabled =
        !editable ||
        !isDraftComplete ||
        team.seasonAddDropsUsed >= 2 ||
        !dropKey ||
        !addKey;

    return (
        <div style={{ border: "2px solid #ddd", borderRadius: 14, padding: 12, opacity: editable ? 1 : 0.6 }}>
            <div key={team.owner} style={{ border: "2px solid #ddd", borderRadius: 14, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    {readOnly && (
                        <div style={{ fontSize: 12, color: "#777", marginBottom: 6 }}>
                         Viewing as Visitor (read-only)
                        </div>
                    )}

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

                        const isCaptain = !!captainKey && k === captainKey;
                        const locked = !isCaptain && isPlayerLocked(team, k, activeNight);

                        const canSwapOut =
                            editable &&
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
                                    {editable && (
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
                                    )}
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

                        const lockedStyle = isPlayerLocked(team, k, activeNight)
                            ? { opacity: 0.6, filter: "grayscale(30%)" }
                            : undefined;
                        const canSwapIn =
                            editable &&
                            !isPlayerLocked(team, k, activeNight) &&
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
                                        locked={isPlayerLocked(team, k, activeNight)}
                                        isCaptain={isCaptain}
                                    />
                                </div>

                                {/* RIGHT: score + swap */}
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <div style={{ fontWeight: 600 }}>
                                        {p.points} pts
                                    </div>
                                    {editable && (
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
                                    )}
                                </div>


                            </div>

                        );
                    })}
                </div>

                <button
                    disabled={!isDraftComplete || !editable}
                    onClick={handleSaveLineup}
                >
                    💾 Save Lineup
                </button>

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
                {/* ADD / DROP (SEASON-BASED) */}
                {editable && isDraftComplete && (
                    <div
                        style={{
                            marginTop: 16,
                            padding: 12,
                            borderTop: "2px solid #eee",
                            background: "#fafafa",
                            borderRadius: 10,
                        }}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <h4 style={{ margin: 0 }}>Add / Drop</h4>
                            <span style={{ fontSize: 12, color: "#666" }}>
                                {2 - team.seasonAddDropsUsed} remaining
                            </span>
                        </div>

                        <button
                            style={{ marginTop: 6 }}
                            disabled={team.seasonAddDropsUsed >= 2}
                            onClick={() => setShowAddDrop(s => !s)}
                        >
                            {showAddDrop ? "Hide" : "Open"}
                        </button>

                        {showAddDrop && (
                            <div style={{ marginTop: 10 }}>
                                {/* DROP */}
                                <div style={{ marginBottom: 8 }}>
                                    <div style={{ fontSize: 12, color: "#444" }}>Drop</div>
                                    <select
                                        value={dropKey}
                                        onChange={e => setDropKey(e.target.value)}
                                        style={{ width: "100%" }}
                                    >
                                        <option value="">Select player</option>
                                        {droppable.map(k => (
                                            <option key={k} value={k}>
                                                {playersByKey.get(k)?.displayName ?? k}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* ADD */}
                                <div style={{ marginBottom: 8 }}>
                                    <div style={{ fontSize: 12, color: "#444" }}>Add</div>
                                    <select
                                        value={addKey}
                                        onChange={e => setAddKey(e.target.value)}
                                        style={{ width: "100%" }}
                                    >
                                        <option value="">Select player</option>
                                        {availablePlayers.map(p => (
                                            <option key={p.key} value={p.key}>
                                                {p.displayName}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <button
                                    disabled={addDropDisabled}
                                    onClick={() => {
                                        if (!editable) return;
                                        doAddDrop(teamIdx, dropKey, addKey);
                                        setDropKey("");
                                        setAddKey("");
                                        setShowAddDrop(false);
                                    }}
                                    style={{
                                        width: "100%",
                                        padding: 10,
                                        borderRadius: 8,
                                        background: addDropDisabled ? "#ccc" : "#111",
                                        color: "white",
                                        fontWeight: 600,
                                    }}
                                >
                                    ✅ Confirm Add / Drop
                                </button>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div >
    );
}
