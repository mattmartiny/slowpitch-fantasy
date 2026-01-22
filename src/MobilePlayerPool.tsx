import type { Team, PlayerTotals } from "./types";

type MobilePlayerPoolProps = {
  pool: PlayerTotals[];
  isTaken: (key: string) => boolean;
  addStarter: (idx: 0 | 1, key: string) => void;
  setBench: (idx: 0 | 1, key: string) => void;
  teams: [Team, Team];
  isDraftComplete: boolean;

};

export function MobilePlayerPool({
  pool,
  isTaken,
  addStarter,
  setBench,
  teams,
  isDraftComplete,
}: MobilePlayerPoolProps) {
  return (
    <div style={{ marginTop: 20 }}>
      <h3>Player Pool</h3>

      {pool.map((p) => {
        const taken = isTaken(p.key);

        return (
          <div
            key={p.key}
            style={{
              padding: 12,
              marginBottom: 10,
              borderRadius: 12,
              border: "1px solid #ddd",
              background: taken ? "#f5f5f5" : "#fff",
              opacity: taken ? 0.6 : 1,
            }}
          >
            {/* HEADER */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <strong>{p.displayName}</strong>
                <div style={{ fontSize: 12, color: "#666" }}>
                  {p.leagues.join("/")}
                </div>
              </div>

              <div style={{ fontWeight: 600 }}>
                {p.points.toFixed(1)} pts
              </div>
            </div>

            {/* ACTIONS */}
            {!isDraftComplete && !taken && (
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  marginTop: 10,
                }}
              >
                {[0, 1].map((teamIdx) => {
                  const team = teams[teamIdx];
                  const starterFull = team.starters.length >= 3;
                  const benchFull = team.bench.length >= 2;

                  return (
                    <div key={teamIdx} style={{ flex: 1 }}>
                      <button
                        disabled={starterFull}
                        onClick={() => addStarter(teamIdx as 0 | 1, p.key)}
                        style={{
                          width: "100%",
                          padding: 8,
                          borderRadius: 8,
                        }}
                      >
                        Starter → {team.owner}
                      </button>

                      <button
                        disabled={benchFull}
                        onClick={() => setBench(teamIdx as 0 | 1, p.key)}
                        style={{
                          width: "100%",
                          padding: 8,
                          marginTop: 4,
                          borderRadius: 8,
                        }}
                      >
                        Bench → {team.owner}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {taken && (
              <div style={{ fontSize: 12, marginTop: 6, color: "#777" }}>
                Taken
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
