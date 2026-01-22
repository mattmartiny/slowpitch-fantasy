import { TOKEN_KEY } from "./auth";

export type AuthUser = {
  name: string;
  teamId: string | null;
};

type JwtPayload = {
  name?: string;
  unique_name?: string;
  teamId?: string; // 👈 IMPORTANT
};

/**
 * Safe Base64URL → JSON parser
 */
function parseJwt(token: string): JwtPayload {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );

    return JSON.parse(json);
  } catch {
    return {};
  }
}

export function useAuth(): AuthUser | null {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;

  const payload = parseJwt(token);

  const rawName = payload.name ?? payload.unique_name;
  if (!rawName) return null;

  return {
    name: rawName.toLowerCase(), // normalize once
    teamId: payload.teamId ?? null, // ✅ may be null for now
  };
}
