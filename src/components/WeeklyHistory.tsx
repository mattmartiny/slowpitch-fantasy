// WeeklyHistory.tsx
import type { PlayerTotals } from "../types";

type Props = {
  history: {
    week: number;
    scores: [number, number];
    locked: [string[], string[]];
    processedAt: string;
  }[];
  owners: [string, string];
  playersByKey: Map<string, PlayerTotals>;
};

export function WeeklyHistory({ history, owners, playersByKey }: Props) {
  if (!history.length) {
    return <div style={{ fontSize: 13, color: "#666" }}>No completed weeks yet.</div>;
  }

  return (
    <div style={{ marginTop: 18 }}>
      <h3>📊 Weekly History</h3>

      {history
  .slice()
  .reverse()
  .map((h) => {
    const winner =
      h.scores[0] === h.scores[1]
        ? null
        : h.scores[0] > h.scores[1]
        ? 0
        : 1;

    return (
      <div
        key={h.week}
        style={{
          marginBottom: 12,
          padding: 12,
          borderRadius: 10,
          background: "#f9f9f9",
          border: "1px solid #ddd",
        }}
      >
        <div style={{ fontWeight: 600 }}>
          Week {h.week}

          {/* 🏆 Winner / 🤝 Tie */}
          {winner !== null ? (
            <span style={{ marginLeft: 8 }}>
              🏆 {owners[winner]}
            </span>
          ) : (
            <span style={{ marginLeft: 8, color: "#777" }}>
              🤝 Tie
            </span>
          )}
        </div>

        <div style={{ fontSize: 13, marginTop: 4 }}>
          {owners[0]}:{" "}
          <b
            style={{
              color: winner === 0 ? "green" : undefined,
            }}
          >
            {h.scores[0].toFixed(2)}
          </b>{" "}
          pts
          <br />
          {owners[1]}:{" "}
          <b
            style={{
              color: winner === 1 ? "green" : undefined,
            }}
          >
            {h.scores[1].toFixed(2)}
          </b>{" "}
          pts
        </div>

        <div style={{ fontSize: 11, color: "#888", marginTop: 6 }}>
          Processed {new Date(h.processedAt).toLocaleString()}
        </div>
      </div>
    );
  })}

    </div>
  );
}
