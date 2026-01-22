import { TOKEN_KEY } from "./auth";
import { useEffect, useState } from "react";

export type AuthUser = {
  name: string;
  teamId: string | null;
};

type JwtPayload = {
  name?: string;
  unique_name?: string;
  teamId?: string;
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

    setAuth(
      name
        ? {
            name,
            teamId: payload.teamId ?? null,
          }
        : null
    );
  }, [authDirty]);

  return auth;
}
