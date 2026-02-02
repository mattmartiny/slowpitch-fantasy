import type { Team, PlayerTotals } from "./types";

type Props = {
    pool: PlayerTotals[];
    isTaken: (key: string) => boolean;
    isDraftComplete: boolean;
    teams: Team[];
    addActive: (idx: 0 | 1, key: string) => void;
    setBench: (idx: 0 | 1, key: string) => void;
    availablePlayers: PlayerTotals[];
};

export function DesktopPlayerPool({

    pool,
    isTaken,
    addActive,
    setBench,
    teams,
    isDraftComplete,
    availablePlayers
}: Props) {


    return (
        <div style={{ marginTop: 20 }}>
            <h2 style={{ marginTop: 18 }}>Player Pool</h2>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
                Players: {pool.length} · Available: {availablePlayers.length}
            </div>

            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                        <tr style={{ background: "#f6f6f6" }}>
                            {[
                                "Rank",
                                "Player",
                                "Leagues",
                                "Pts",
                                "PA",
                                "Pts/PA",
                                "1B",
                                "2B",
                                "3B",
                                "HR",
                                "BB",
                                "R",
                                "RBI",
                                "ROE",
                                "OUT",
                                "Draft",
                            ].map((h) => (
                                <th key={h} style={{ borderBottom: "1px solid #ddd", textAlign: "left", padding: 8, whiteSpace: "nowrap" }}>
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {pool.map((p, i) => {
                            const taken = isTaken(p.key);
                            return (
                                <tr
                                    key={p.key}
                                    style={{
                                        opacity: isDraftComplete ? 0.35 : taken ? 0.45 : 1,
                                        pointerEvents: isDraftComplete ? "none" : "auto",
                                    }}
                                >
                                    <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{i + 1}</td>
                                    <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                                        <b>{p.displayName}</b>
                                        {taken && <span style={{ marginLeft: 8, fontSize: 12, color: "#777" }}>(taken)</span>}
                                    </td>
                                    <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{p.leagues.join("/")}</td>
                                    <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{(p.points)}</td>
                                    <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{p.PA}</td>
                                    <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{p.ptsPerPA.toFixed(3)}</td>
                                    <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{p._1B}</td>
                                    <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{p._2B}</td>
                                    <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{p._3B}</td>
                                    <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{p.HR}</td>
                                    <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{p.BB}</td>
                                    <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{p.R}</td>
                                    <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{p.RBI}</td>
                                    <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{p.ROE}</td>
                                    <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{p.OUT}</td>
                                    <td style={{ borderBottom: "1px solid #eee", padding: 8, whiteSpace: "nowrap" }}>
                                        <div style={{ borderBottom: "1px solid #eee", padding: 8, whiteSpace: "nowrap" }}>
                                            {[0, 1].map((teamIdx) => {
                                                const team = teams[teamIdx];
                                                const activeCount = Array.isArray(team.active) ? team.active.length : 0;
                                                const benchCount = Array.isArray(team.bench) ? team.bench.length : 0;

                                                const activeFull = activeCount >= 4;
                                                const benchFull = benchCount >= 2;

                                                return (
                                                    <div key={teamIdx} style={{ marginBottom: 4 }}>
                                                        <button
                                                            disabled={taken || activeFull}
                                                            onClick={() => addActive(teamIdx as 0 | 1, p.key)}
                                                        >
                                                            Active → {team.owner}
                                                        </button>


                                                        <button
                                                            disabled={taken || benchFull}
                                                            onClick={() => setBench(teamIdx as 0 | 1, p.key)}
                                                            style={{ fontSize: 10, padding: "4px 6px", marginLeft: 4 }}
                                                        >
                                                            Bench → {team.owner}
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>


                                    </td>
                                </tr>
                            );
                        })}

                        {pool.length === 0 && (
                            <tr>
                                <td colSpan={16} style={{ padding: 10, color: "#777" }}>
                                    Upload both totals CSVs to build the player pool.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
        





            </div>
        </div>
    );
}