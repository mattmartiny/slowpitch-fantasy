// MobileTeamCard.tsx
import React from "react";
import type { Team, PlayerTotals, PendingSwap } from "./types";
import { maybeCaptainKey, getWeeklyBench } from "./AuthedApp";
import { saveLineup } from "./api/lineups";


type Props = {
    team: Team;
    teamIdx: 0 | 1;
    total: number;
    playersByKey: Map<string, PlayerTotals>;
    pendingSwap: PendingSwap | null;
    setPendingSwap: React.Dispatch<React.SetStateAction<PendingSwap | null>>;
    executeSwap: () => void;
    doAddDrop: (
        teamIdx: 0 | 1,
        dropKey: string,
        addKey: string
    ) => void;
    isDraftComplete: boolean;
    record: {
        wins: number;
        losses: number;
        ties: number;
    };

    canEditTeam: (idx: 0 | 1) => boolean;
    isPlayerLocked: (team: Team, key: string, night: "MON" | "FRI") => boolean;
    isNightLocked: (team: Team, night: "MON" | "FRI") => boolean;
    LockIcon: React.FC<{ locked: boolean; isCaptain?: boolean }>;
    seasonId: number;
    readOnly?: boolean;
};

export function MobileTeamCard({
    team,
    teamIdx,
    total,
    playersByKey,
    pendingSwap,
    setPendingSwap,
    executeSwap,
    record,
    canEditTeam,
    isPlayerLocked,
    isNightLocked,
    LockIcon,
    isDraftComplete,
    doAddDrop,
    seasonId,
    readOnly = false,
}: Props) {


    const [showAddDrop, setShowAddDrop] = React.useState(false);
    const [dropKey, setDropKey] = React.useState("");
    const [addKey, setAddKey] = React.useState("");

    const idx = teamIdx;
    const activeNight: "MON" | "FRI" =
        !team.processed.MON ? "MON" : "FRI";
    const captainKey = maybeCaptainKey(team);


    function captainFirst(list: string[]) {
        if (!captainKey) return list;

        return [...list].sort((a, b) => {
            if (a === captainKey) return -1;
            if (b === captainKey) return 1;
            return 0;
        });
    }



    // 🔒 SOURCE OF TRUTH
    const activeList = captainFirst(
        isDraftComplete
            ? team.activeByNight[activeNight]
            : team.active
    );

    const benchList = captainFirst(
        isDraftComplete
            ? getWeeklyBench(team, activeNight)
            : team.bench
    );

    const editable = !readOnly && canEditTeam(teamIdx);


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



    return (
        <div style={{ border: "2px solid #ddd", borderRadius: 14, padding: 12, opacity: editable ? 1 : 0.6 }}>

            {readOnly && (
                <div style={{ fontSize: 12, color: "#777", marginBottom: 6 }}>
                    👀 Viewing as Visitor (read-only)
                </div>
            )}

            {/* HEADER */}
            <div style={{ display: "flex", justifyContent: "space-between" }}>
                <h3 style={{ margin: 0 }}>
                    {team.owner}{" "}
                    <span style={{ fontSize: 12, color: "#666" }}>
                        ({record.wins}-{record.losses}
                        {record.ties ? `-${record.ties}` : ""})
                    </span>
                </h3>

                <div style={{ fontSize: 12 }}>
                    <b>{total}</b> pts
                </div>
            </div>

            {/* ACTIVE */}
            <h4 style={{ marginTop: 12 }}>🟢 Active ({activeNight})</h4>
            {activeList.map(key => {
                const p = playersByKey.get(key);
                if (!p) return null;

                const isCaptain = captainKey !== null && key === captainKey;
                const locked =
                    !isCaptain && isPlayerLocked(team, key, activeNight);

                const canSwapOut =
                    editable &&
                    !locked &&
                    (!isNightLocked(team, activeNight) || isCaptain);

                return (
                    <div
                        key={key}
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: 6,
                        }}
                    >
                        <div>
                            🟢 {p.displayName}{" "}
                            <LockIcon locked={locked} isCaptain={isCaptain} />
                            {isCaptain && " 🧢"}
                        </div>
                        {editable && (
                            <button
                                disabled={!canSwapOut}
                                onClick={() =>
                                    setPendingSwap({
                                        teamIdx: idx,
                                        night: activeNight,
                                        out: key,
                                        in: null,
                                    })
                                }
                            >
                                Swap Out
                            </button>
                        )}
                    </div>
                );
            })}

            {/* BENCH */}
            <h4 style={{ marginTop: 12 }}>⚪ Bench</h4>
            {benchList.map(key => {
                const p = playersByKey.get(key);
                if (!p) return null;

                const isCaptain = captainKey !== null && key === captainKey;
                const locked =
                    !isCaptain && isPlayerLocked(team, key, activeNight);

                const canSwapIn =
                    editable &&
                    pendingSwap?.out &&
                    !locked &&
                    (!isNightLocked(team, activeNight) || isCaptain);

                return (
                    <div
                        key={key}
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: 6,
                        }}
                    >
                        <div>
                            ⚪ {p.displayName}{" "}
                            <LockIcon locked={locked} isCaptain={isCaptain} />
                            {isCaptain && " 🧢"}
                        </div>
                        {editable && (
                            <button
                                disabled={!canSwapIn}
                                onClick={() =>
                                    setPendingSwap(ps =>
                                        ps
                                            ? {
                                                ...ps,
                                                night: activeNight,
                                                in: key,
                                            }
                                            : null
                                    )
                                }
                            >
                                Swap In
                            </button>
                        )}
                    </div>
                );
            })}

            {editable && isDraftComplete && (
                <div
                    style={{
                        marginTop: 14,
                        padding: 10,
                        border: "1px solid #ddd",
                        borderRadius: 10,
                        background: "#fafafa",
                    }}
                >
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <b>Add / Drop</b>
                        <span style={{ fontSize: 12, color: "#666" }}>
                            {2 - team.seasonAddDropsUsed} left
                        </span>
                    </div>

                    <button
                        style={{ marginTop: 6 }}
                        onClick={() => setShowAddDrop(s => !s)}
                        disabled={team.seasonAddDropsUsed >= 2}
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
                                >
                                    <option value="">Select player</option>
                                    {Array.from(playersByKey.values())
                                        .filter(p =>
                                            !rosterKeys.includes(p.key)
                                        )
                                        .map(p => (
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
                            >
                                ✅ Confirm Add / Drop
                            </button>
                        </div>
                    )}
                </div>
            )}





            <button
                disabled={!isDraftComplete || !editable}
                onClick={handleSaveLineup}
            >
                💾 Save Lineup
            </button>


            {/* CONFIRM */}
            {pendingSwap &&
                pendingSwap.teamIdx === idx &&
                pendingSwap.out &&
                pendingSwap.in && (
                    <div style={{ marginTop: 10 }}>
                        <button
                            onClick={() => {
                                if (!editable) return;
                                executeSwap()
                            }}

                            style={{ marginRight: 6 }}
                        >
                            Confirm
                        </button>
                        <button onClick={() => setPendingSwap(null)}>
                            Cancel
                        </button>
                    </div>
                )
            }
        </div >
    );
}
