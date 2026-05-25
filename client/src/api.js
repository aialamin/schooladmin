import axios from "axios";

function resolveApiBaseUrl() {
  const rawUrl = (import.meta.env.VITE_API_URL || "").trim();

  // When Vite proxy is used, keep the axios base empty and call /api/... directly.
  // This prevents accidental /api/api/... requests that caused "Route not found".
  if (!rawUrl || rawUrl === "/api") return "";

  return rawUrl.replace(/\/$/, "");
}

export const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

// Tell any intermediate proxy or CDN not to serve a cached response for API calls.
// The server already sets Cache-Control: no-store on responses; this is defense-in-depth.
api.interceptors.request.use((config) => {
  config.headers["Cache-Control"] = "no-cache";
  config.headers["Pragma"] = "no-cache";
  return config;
});

export function getErrorMessage(error) {
  return (
    error.response?.data?.message ||
    error.message ||
    "Something went wrong. Please try again."
  );
}
