import { useState } from "react";
import { login } from "../auth/auth";

type Props = {
  onSuccess: () => void;
};

export default function Login({ onSuccess }: Props) {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

async function handleLogin() {
  console.log("Attempting login", name, pin);

  try {
    await login(name, pin);
    console.log("JWT after login:", localStorage.getItem("fantasy_jwt"));
    window.location.reload();
  } catch (err) {
    console.error("Login error", err);
    setError("Invalid name or PIN");
  }
}



  return (
    <div style={{ maxWidth: 320, margin: "40px auto" }}>
      <h2>Login</h2>

      <input
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ width: "100%" }}
      />

      <input
        type="password"
        placeholder="PIN"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        style={{ width: "100%", marginTop: 8 }}
      />

      <button
        style={{ marginTop: 12, width: "100%" }}
        onClick={handleLogin}
        disabled={loading}
      >
        {loading ? "Logging in..." : "Login"}
      </button>

      {error && (
        <div style={{ color: "red", marginTop: 8 }}>
          {error}
        </div>
      )}
    </div>
  );
}
