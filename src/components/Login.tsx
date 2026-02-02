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

  async function handleLogin(n = name, p = pin) {
    setLoading(true);
    setError(null);

    try {
      await login(n, p);
      onSuccess(); // ✅ NO reload
    } catch (err) {
      console.error("Login error", err);
      setError("Invalid name or PIN");
    } finally {
      setLoading(false);
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
        disabled={loading}
      />

      <input
        type="password"
        placeholder="PIN"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        style={{ width: "100%", marginTop: 8 }}
        disabled={loading}
      />

      <button
        style={{ marginTop: 12, width: "100%" }}
        onClick={() => handleLogin()}
        disabled={loading}
      >
        {loading ? "Logging in..." : "Login"}
      </button>

      {/* 👀 VISITOR LOGIN */}
      <button
        style={{
          marginTop: 8,
          width: "100%",
          padding: 10,
          borderRadius: 8,
          background: "#f4f4f4",
          border: "1px solid #ccc",
          fontWeight: 600,
        }}
        onClick={() => handleLogin("Visitor", "0000")}
        disabled={loading}
      >
       Login as Visitor
      </button>

      <div style={{ fontSize: 12, color: "#666", marginTop: 6, textAlign: "center" }}>
        Read-only access • No edits allowed
      </div>

      {error && (
        <div style={{ color: "red", marginTop: 8 }}>
          {error}
        </div>
      )}
    </div>
  );
}
