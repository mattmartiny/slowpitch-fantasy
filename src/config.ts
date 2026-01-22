const raw = import.meta.env.VITE_API_URL;

export const API_URL =
  import.meta.env.DEV
    ? raw || "http://localhost:5000"
    : raw || "";

if (!API_URL && import.meta.env.DEV) {
  console.warn("⚠️ API_URL is empty in dev — using localhost fallback");
}
