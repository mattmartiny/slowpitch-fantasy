import { TOKEN_KEY } from "../auth/auth";

export function authFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem(TOKEN_KEY);

  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
}

