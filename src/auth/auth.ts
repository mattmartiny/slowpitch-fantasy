export const TOKEN_KEY = "fantasy_jwt";

import { apiAuthFetch } from "../api/apiAuthFetch";

export async function login(name: string, pin: string) {
  const res = await apiAuthFetch(`/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, pin }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Login failed:", text);
    throw new Error("Login failed");
  }

  const data = await res.json();
  localStorage.setItem(TOKEN_KEY, data.token);
}


