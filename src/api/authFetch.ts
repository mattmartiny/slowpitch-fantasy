// src/auth/authFetch.ts

export async function authFetch(
  url: string,
  options: RequestInit = {}
) {
  const token = localStorage.getItem("token");

  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
}
