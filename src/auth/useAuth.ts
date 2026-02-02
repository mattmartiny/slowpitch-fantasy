import { TOKEN_KEY } from "./auth";
import { useEffect, useState } from "react";

export type AuthUser = {
  userId: string;
  name: string;
  role: "admin" | "player" | "visitor";
  teamId: string | null;
};

type JwtPayload = {
  sub?: string;              // ← userId
  name?: string;
  unique_name?: string;
  teamId?: string;
  role?: string;
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"?: string;
};

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

export function useAuth(authDirty?: number) {
  const [auth, setAuth] = useState<AuthUser | null | undefined>(undefined);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      setAuth(null);
      return;
    }

    const payload = parseJwt(token);

    const name =
      payload.name ??
      payload.unique_name ??
      null;

    const userId = payload.sub ?? null;
    const role =
      payload.role ??
      payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ??
      "player";
    setAuth(
      name && userId
        ? {
          name,
          userId,
          role: role as "admin" | "player" | "visitor",
          teamId: payload.teamId ?? null, // 🔒 ALWAYS resolved from DB
        }
        : null
    );
  }, [authDirty]);

  return { auth, setAuth };
}
