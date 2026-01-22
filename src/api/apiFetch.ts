import { API_URL } from "../config";

export async function apiFetch(path: string, options?: RequestInit) {
  if (!API_URL && import.meta.env.DEV) {
    throw new Error("API_URL is empty — aborting fetch");
  }

  const res = await fetch(`${API_URL}${path}`, options);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }

  return res.json();
}
