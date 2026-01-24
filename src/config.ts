const raw = import.meta.env.VITE_API_URL;

export const API_URL =
  import.meta.env.DEV
    ? raw || "http://localhost:5000"
    : raw || "https://sbfantasy.mattmartiny.com/api";
