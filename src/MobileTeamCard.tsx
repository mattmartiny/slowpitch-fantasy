// MobileTeamCard.tsx
import React from "react";
import type { Team, PlayerTotals, PendingSwap } from "./types";
import { getCaptainKey, getWeeklyBench } from "./App";

type Props = {
    team: Team;
    teamIdx: 0 | 1;
    total: number;
    playersByKey: Map<string, PlayerTotals>;
    availablePlayers: PlayerTotals[];
    pendingSwap: PendingSwap | null;
    setPendingSwap: React.Dispatch<React.SetStateAction<PendingSwap | null>>;
    executeSwap: () => void;
    doAddDrop: (
        idx: 0 | 1,
        night: "MON" | "FRI",
        dropKey: string,
        addKey: string
    ) => void;

    record: {
        wins: number;
        losses: number;
        ties: number;
    };

    canEditTeam: (idx: 0 | 1) => boolean;
    isPlayerLocked: (team: Team, key: string) => boolean;
    isNightLocked: (team: Team, night: "MON" | "FRI") => boolean;
    LockIcon: React.FC<{ locked: boolean; isCaptain?: boolean }>;
    isDraftComplete: boolean;
       removeDrafted: (idx: 0 | 1, key: string) => void;
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
    availablePlayers,
    doAddDrop,
    canEditTeam,
    isPlayerLocked,
    isNightLocked,
    isDraftComplete,
    removeDrafted,
    LockIcon,
}: Props) {
    const idx = teamIdx;

    const activeNight: "MON" | "FRI" =
        !team.processed.MON ? "MON" : "FRI";

    const captainKey = getCaptainKey(team);

    function captainFirst(list: string[]) {
        return [...list].sort((a, b) => {
            if (a === captainKey) return -1;
            if (b === captainKey) return 1;
            return 0;
        });
    }

    // 🔒 SOURCE OF TRUTH
    const activeList = captainFirst(team.activeByNight[activeNight]);
    const benchList = captainFirst(
        getWeeklyBench(team, activeNight)
    );

    return (
        <div style={{ border: "2px solid #ddd", borderRadius: 14, padding: 12 }}>
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

                const isCaptain = key === captainKey;
                const locked =
                    !isCaptain && isPlayerLocked(team, key);

                const canSwapOut =
                    canEditTeam(idx) &&
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
                    </div>
                );
            })}

            {/* BENCH */}
            <h4 style={{ marginTop: 12 }}>⚪ Bench</h4>
            {benchList.map(key => {
                const p = playersByKey.get(key);
                if (!p) return null;

                const isCaptain = key === captainKey;
                const locked =
                    !isCaptain && isPlayerLocked(team, key);

                const canSwapIn =
                    canEditTeam(idx) &&
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
                    </div>
                );
            })}

            {/* CONFIRM */}
            {pendingSwap &&
                pendingSwap.teamIdx === idx &&
                pendingSwap.out &&
                pendingSwap.in && (
                    <div style={{ marginTop: 10 }}>
                        <button
                            onClick={executeSwap}
                            style={{ marginRight: 6 }}
                        >
                            Confirm
                        </button>
                        <button onClick={() => setPendingSwap(null)}>
                            Cancel
                        </button>
                    </div>
                )}
        </div>
    );
}
