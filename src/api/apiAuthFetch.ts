export async function apiAuthFetch(
  input: RequestInfo,
  init: RequestInit = {}
): Promise<Response> {
  const token = localStorage.getItem("fantasy_jwt");

  const res = await fetch(input, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: token ? `Bearer ${token}` : "",
    },
  });

  return res; // ✅ DO NOT parse here
}
