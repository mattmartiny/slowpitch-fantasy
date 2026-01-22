export async function getPlayers() {
  const res = await fetch("http://localhost:5000/api/players");
  if (!res.ok) throw new Error("Failed to load players");
  return res.json() as Promise<{ playerId: string; name: string }[]>;
}
