import { startNewSeason } from "../api/seasons";
import { useState } from "react";

export function NewSeasonButton() {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!confirm("Start a new season? All stats will reset.")) return;

    const confirmText = prompt('Type "NEW SEASON" to confirm');
    if (confirmText !== "NEW SEASON") return;

    try {
      setLoading(true);
      const { seasonId } = await startNewSeason();
      alert(`New season started (ID: ${seasonId})`);

      // TEMP: just reload for now
      window.location.reload();
    } catch (err: any) {
      alert(err.message ?? "Failed to start new season");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      disabled={loading}
      style={{
        padding: "10px 14px",
        borderRadius: 10,
        border: "1px solid #b00020",
        background: "#b00020",
        color: "white",
      }}
      onClick={handleClick}
    >
      {loading ? "Starting Season..." : "🆕 Start New Season"}
    </button>
  );
}
